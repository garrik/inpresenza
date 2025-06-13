#!/usr/bin/env python3
#
# Process an html file to inline its resources;
# Does not support all possible sintaxes to keep it simple:
# - inline css files (no multiline <style> support)
# - inline js files (no multiline <script> support)
#   - move inlined imports to the bottom of body
#     (defer works only for script with src attribute)
#   - resolve local imports
#
# Usage: ./inline_resources.py index.html
#

import os
import re
import sys
import urllib.request

def move_scripts_to_body_end(html):
    script_pattern = re.compile(r'<script.+src="[^"]+"></script>', re.IGNORECASE)

    scripts = script_pattern.findall(html)
    if not scripts:
        return html

    print(f'Moving {len(scripts)} <script> tag(s) to end of <body>')

    # Remove scripts from their original location
    html_without_scripts = script_pattern.sub('', html)

    # Append scripts before end of <body> tag, or at the end of the file if no </body>
    body_close_match = re.search(r'</body\s*>', html_without_scripts, re.IGNORECASE)
    if body_close_match:
        pos = body_close_match.start()
        html = html_without_scripts[:pos] + '\n'.join(scripts) + html_without_scripts[pos:]
    else:
        # Fallback: append at the end
        html = html_without_scripts + '\n'.join(scripts)

    return html

def inline_js(html, base_dir=None):
    pattern = re.compile(r'<script.+src="([^"]+)"></script>', re.IGNORECASE)

    def replace_script(match):
        js_path = os.path.join(base_dir, match.group(1))
        is_js_module = 'module' in match.group(0)
        try:
            js_content = resolve_js(js_path)
            print(f'Inlined {js_path}')
            return f'<script {is_js_module and 'type="module"'}>{js_content}</script>' if len(js_content) > 0 else ''
        except Exception as e:
            print(f'Error processing {js_path}: {e}', file=sys.stderr)
            return match.group(0)

    def resolve_js(path, resolved_files=set()):
        if path in resolved_files:
            return ''
        resolved_files.add(path)

        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
        except FileNotFoundError:
            print(f'File not found: {path}', file=sys.stderr)
            return ''

        # Resolve local import
        # E.g.: import { insertEvent, clearEvents, exportEvents } from './presence-tracker.js'
        import_pattern = re.compile(r'import\s+.*?\s+from\s+[\'"](.+?)[\'"];?')
        resolved_code = ''
        for match in import_pattern.finditer(content):
            import_path = match.group(1)
            import_file = os.path.normpath(os.path.join(os.path.dirname(path), import_path))
            resolved_code += resolve_js(import_file, resolved_files)
            print(f'Inlined module {import_path}')

        # Remove declarations of module import/export
        content = re.sub(r'^\s*import\s+.*$', '// import removed', content, flags=re.MULTILINE)
        content = re.sub(r'^\s*export\s+{.*$', '// export removed', content, flags=re.MULTILINE)

        resolved_code += content + '\n'
        return resolved_code

    return pattern.sub(replace_script, html)

def inline_css(html, base_dir=None):
    pattern = re.compile(r'<link\s+rel="stylesheet".+href="([^"]+)".*>', re.IGNORECASE)

    def replace_stylesheet(match):
        href = match.group(1)
        if href.startswith('http://') or href.startswith('https://'):
            try:
                with urllib.request.urlopen(href) as response:
                    css_content = response.read().decode('utf-8')
                print(f'Inlined {href}')
            except Exception as e:
                print(f'Failed to download {href}: {e}', file=sys.stderr)
                return match.group(0)
        else:
            css_path = os.path.join(base_dir, href)
            try:
                with open(css_path, 'r', encoding='utf-8') as file:
                    css_content = file.read()
                print(f'Inlined {css_path}')
            except FileNotFoundError:
                print(f'File not found: {css_path}', file=sys.stderr)
                return match.group(0)

        return f'<style>\n{css_content}\n</style>'
    
    return pattern.sub(replace_stylesheet, html)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f'Usage: {sys.argv[0]} index.html')
        sys.exit(1)

    html_path = sys.argv[1]
    base_dir = os.path.dirname(html_path)

    with open(html_path, 'r', encoding='utf-8') as file:
        html = file.read()

    html = move_scripts_to_body_end(html)
    html = inline_js(html, base_dir)
    html = inline_css(html, base_dir)

    output_file = os.path.basename(html_path).replace('.html', '.inlined.html')
    output_path = os.path.join(base_dir, output_file)
    with open(output_path, 'w', encoding='utf-8') as file:
        file.write(html)

    print(f'File saved {output_path}')
