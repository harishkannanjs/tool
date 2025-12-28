import sys
import json
import requests
import re
import os
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

class WebsiteCrawler:
    def __init__(self, target_url):
        self.target_url = target_url
        self.domain = urlparse(target_url).netloc
        self.base_url = f"{urlparse(target_url).scheme}://{self.domain}"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        })
        self.css_files = []
        self.js_files = []
        self.inline_styles = []
        self.inline_scripts = []
        self.processed_urls = set()
        self.max_css_depth = 3

    def rewrite_url(self, url, base_url):
        if not url or url.startswith(('data:', 'http', 'var(', '#')):
            return url
        
        file_base_url = f"{urlparse(base_url).scheme}://{urlparse(base_url).netloc}"
        file_base_path = base_url.rsplit('/', 1)[0] + '/'
        
        if url.startswith('//'):
            return 'https:' + url
        elif url.startswith('/'):
            return file_base_url + url
        else:
            return urljoin(file_base_path, url)

    def fetch_css_recursive(self, css_url, depth=0):
        if depth > self.max_css_depth or css_url in self.processed_urls:
            return ""
        
        self.processed_urls.add(css_url)
        try:
            res = self.session.get(css_url, timeout=10)
            if res.status_code != 200:
                return ""
            
            content = res.text
            
            # 1. Flatten @imports
            def flatten_import(match):
                import_path = match.group(1).strip("'\"")
                abs_url = self.rewrite_url(import_path, css_url)
                return self.fetch_css_recursive(abs_url, depth + 1)

            content = re.sub(r'@import\s+url\(?["\']?([^"\']+)["\']?\)?;?', flatten_import, content)
            
            # 2. Rewrite normal URLs (fonts, images)
            def replace_url(match):
                url_path = match.group(1).strip("'\"")
                abs_url = self.rewrite_url(url_path, css_url)
                return f"url('{abs_url}')"

            content = re.sub(r'url\((?!\s*["\']?data:)([^)]+)\)', replace_url, content)
            
            return content
        except:
            return ""

    def fetch_page(self):
        try:
            response = self.session.get(self.target_url, timeout=15)
            response.raise_for_status()
            if response.encoding == 'ISO-8859-1':
                response.encoding = response.apparent_encoding
            return response.text
        except Exception as e:
            return None

    def crawl(self):
        html = self.fetch_page()
        if not html:
            return {"error": "Could not fetch page"}

        soup = BeautifulSoup(html, 'html.parser')
        
        # 1. External Stylesheets (with flattening)
        for link in soup.find_all('link', rel='stylesheet'):
            href = link.get('href')
            if not href: continue
            full_url = urljoin(self.target_url, href)
            
            content = self.fetch_css_recursive(full_url)
            if content:
                self.css_files.append({"url": full_url, "content": content})

        # 2. External Scripts
        for script in soup.find_all('script', src=True):
            src = script.get('src')
            full_url = urljoin(self.target_url, src)
            if full_url in self.processed_urls: continue
            self.processed_urls.add(full_url)
            
            try:
                res = self.session.get(full_url, timeout=10)
                if res.status_code == 200:
                    self.js_files.append({"url": full_url, "content": res.text})
            except: pass

        # 3. Inline Styles
        for style in soup.find_all('style'):
            if style.string:
                # Regular URL rewrite for inline (no depth needed as @import is rare in inline)
                content = style.string
                def replace_inline_url(match):
                    url_path = match.group(1).strip("'\"")
                    abs_url = self.rewrite_url(url_path, self.target_url)
                    return f"url('{abs_url}')"
                content = re.sub(r'url\((?!\s*["\']?data:)([^)]+)\)', replace_inline_url, content)
                self.inline_styles.append(content)

        # 4. Inline Scripts
        for script in soup.find_all('script', src=False):
            if script.string:
                self.inline_scripts.append(script.string)

        return {
            "html": str(soup),
            "css_files": self.css_files,
            "js_files": self.js_files,
            "inline_styles": self.inline_styles,
            "inline_scripts": self.inline_scripts,
            "root_variables": self.extract_all_variables(),
            "metadata": {
                "title": soup.title.string if soup.title else "",
                "description": soup.find("meta", attrs={"name": "description"}).get("content", "") if soup.find("meta", attrs={"name": "description"}) else "",
                "html_attributes": soup.html.attrs if soup.html else {},
                "body_attributes": soup.body.attrs if soup.body else {}
            }
        }

    def extract_all_variables(self):
        """
        Extract ALL variables from all CSS content, prioritizing those in :root
        but catching others for fallback alignment accuracy.
        """
        all_css = "\n".join([f['content'] for f in self.css_files] + self.inline_styles)
        variables = {}
        
        # Capture all --var: value patterns
        # We search globally first to ensure we don't miss anything that affects alignment
        var_matches = re.findall(r'(--[^:]+):\s*([^;!]+)', all_css)
        for var, val in var_matches:
            variables[var.strip()] = val.strip()
            
        return variables

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL provided"}))
        sys.exit(1)
        
    crawler = WebsiteCrawler(sys.argv[1])
    result = crawler.crawl()
    print(json.dumps(result))
