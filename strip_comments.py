fimport os
import re

def strip_js_css_comments(content):
    # Regex to handle strings and comments:
    # Match double-quoted string, single-quoted string, template literal, or a comment
    # We keep the strings and replace comments with either empty space or keep them if they are in URLs.
    pattern = r'(".*?"|\'.*?\'|`[\s\S]*?`)|(//.*?$|/\*[\s\S]*?\*/)'
    
    def repl(m):
        if m.group(2):
            return ''
        else:
            return m.group(1)
            
    return re.sub(pattern, repl, content, flags=re.MULTILINE)

def strip_html_comments(content):
    # HTML comments <!-- ... -->
    pattern = r'<!--[\s\S]*?-->'
    return re.sub(pattern, '', content)

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    ext = os.path.splitext(filepath)[1]
    if ext in ['.js', '.css']:
        content = strip_js_css_comments(content)
    elif ext == '.html':
        content = strip_html_comments(content)
        # also process inline styles and scripts if there are any
        # Not strictly needed if they are short, but let's be thorough
        # Actually doing strip_js_css_comments might break HTML structure if there are // in URLs in HTML.
        # So we only strip HTML comments in HTML files, and let JS/CSS files be handled.

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Stripped comments in {filepath}")

for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith(('.html', '.css', '.js')):
            path = os.path.join(root, f)
            process_file(path)
print("Done stripping comments.")
