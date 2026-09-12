import os
import re

def bundle():
    print("=== Bundling League of Customs Frontend Assets ===")
    src_dir = 'src'
    index_path = os.path.join(src_dir, 'index.html')
    bundle_path = os.path.join(src_dir, 'index.bundle.html')
    root_index_path = 'index.html'

    if not os.path.exists(index_path):
        raise FileNotFoundError(f"Cannot find source index at {index_path}")

    with open(index_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Inline CSS stylesheets
    def replace_css(match):
        css_rel = match.group(1)
        css_full = os.path.join(src_dir, css_rel)
        if not os.path.exists(css_full):
            raise FileNotFoundError(f"Referenced stylesheet not found: {css_full}")
        with open(css_full, 'r', encoding='utf-8') as cf:
            css_content = cf.read()
        print(f"  [INLINE CSS] {css_rel} ({len(css_content):,} bytes)")
        return f"<style>\n{css_content}\n</style>"

    html_bundled = re.sub(r'<link\s+rel=["\']stylesheet["\']\s+href=["\'](css/[^"\']+)["\']\s*\/?>', replace_css, html)

    # 2. Inline JS scripts
    def replace_js(match):
        js_rel = match.group(1)
        js_full = os.path.join(src_dir, js_rel)
        if not os.path.exists(js_full):
            raise FileNotFoundError(f"Referenced script not found: {js_full}")
        with open(js_full, 'r', encoding='utf-8') as jf:
            js_content = jf.read()
        print(f"  [INLINE JS]  {js_rel} ({len(js_content):,} bytes)")
        return f"<script>\n{js_content}\n</script>"

    html_bundled = re.sub(r'<script\s+src=["\'](js/[^"\']+)["\']><\/script>', replace_js, html_bundled)

    # 3. Write bundled file to src/index.bundle.html
    with open(bundle_path, 'w', encoding='utf-8') as f:
        f.write(html_bundled)
    print(f"  -> Generated: {bundle_path} ({len(html_bundled):,} bytes, {html_bundled.count(chr(10))} lines)")

    # 4. Also update root index.html
    with open(root_index_path, 'w', encoding='utf-8') as f:
        f.write(html_bundled)
    print(f"  -> Synchronized: {root_index_path} ({len(html_bundled):,} bytes)")
    print("=== Bundling Completed Successfully! ===\n")

if __name__ == '__main__':
    bundle()
