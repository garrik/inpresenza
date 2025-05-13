#!/bin/env python3

import os
import re
import sys
import urllib.request

def inline_js(html, base_dir=None):
    pattern = re.compile(r'<script.+src="([^"]+)"></script>', re.IGNORECASE)

    def replace_script(match):
        js_path = os.path.join(base_dir, match.group(1))
        try:
            with open(js_path, 'r', encoding='utf-8') as file:
                js_content = file.read()
            print(f'Inlined {js_path}')
            return f'<script>\n{js_content}\n</script>'
        except FileNotFoundError:
            print(f'File not found: {js_path}', file=sys.stderr)
            return match.group(0) # keep orig tag
    
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
        print('Usage: ./inline_resources.py index.html')
        sys.exit(1)

    html_path = sys.argv[1]
    base_dir = os.path.dirname(html_path)

    with open(html_path, 'r', encoding='utf-8') as file:
        html = file.read()

    html = inline_js(html, base_dir)
    html = inline_css(html, base_dir)

    output_path = os.path.join(base_dir, 'inlined_index.html')
    with open(output_path, 'w', encoding='utf-8') as file:
        file.write(html)

    print(f'File saved {output_path}')
