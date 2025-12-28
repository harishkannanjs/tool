import sys
import json
import requests
import re
import os
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

class CSSCrawler:
    def __init__(self, target_url):
        self.target_url = target_url
        self.domain = urlparse(target_url).netloc
        self.base_url = f"{urlparse(target_url).scheme}://{self.domain}"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        self.css_files = []
        self.inline_styles = []
        self.processed_urls = set()

    def rewrite_urls(self, css_content, css_file_url):
        """
        Organized URL rewriting for fonts/images in CSS
        """
        base_parts = urlparse(css_file_url)
        file_base_url = f"{base_parts.scheme}://{base_parts.netloc}"
        file_base_path = css_file_url.rsplit('/', 1)[0] + '/'
        
        def replace_url(match):
            url_path = match.group(1).strip("'\"")
            
            if (url_path.startswith('data:') or 
                url_path.startswith('http') or 
                url_path.startswith('var(') or
                url_path.startswith('#')):
                return match.group(0)
                
            if url_path.startswith('//'):
                abs_url = 'https:' + url_path
            elif url_path.startswith('/'):
                abs_url = file_base_url + url_path
            else:
                abs_url = urljoin(file_base_path, url_path)
                
            return f"url('{abs_url}')"

        # Replace url(...)
        content = re.sub(r'url\((?!\s*["\']?data:)([^)]+)\)', replace_url, css_content)
        
        # Replace @import
        def replace_import(match):
            import_path = match.group(1).strip("'\"")
            if import_path.startswith('http'):
                return match.group(0)
            
            if import_path.startswith('/'):
                abs_url = file_base_url + import_path
            else:
                abs_url = urljoin(file_base_path, import_path)
            return f"@import '{abs_url}';"

        content = re.sub(r'@import\s+["\']([^"\']+)["\'];?', replace_import, content)
        return content

    def fetch_page(self):
        try:
            response = self.session.get(self.target_url, timeout=15)
            response.raise_for_status()
            # Handle encoding correctly
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
        
        # 1. External Stylesheets
        for link in soup.find_all('link', rel='stylesheet'):
            href = link.get('href')
            if not href: continue
            
            full_url = urljoin(self.target_url, href)
            if full_url in self.processed_urls: continue
            self.processed_urls.add(full_url)
            
            try:
                res = self.session.get(full_url, timeout=10)
                if res.status_code == 200:
                    content = self.rewrite_urls(res.text, full_url)
                    self.css_files.append({
                        "url": full_url,
                        "content": content
                    })
            except:
                pass

        # 2. Inline Styles
        for style in soup.find_all('style'):
            if style.string:
                content = self.rewrite_urls(style.string, self.target_url)
                self.inline_styles.append(content)

        return {
            "css_files": self.css_files,
            "inline_styles": self.inline_styles,
            "root_variables": self.extract_root_variables()
        }

    def extract_root_variables(self):
        """
        Specifically extract CSS variables from :root blocks
        """
        all_css = "\n".join([f['content'] for f in self.css_files] + self.inline_styles)
        variables = {}
        # Find :root { ... } blocks
        root_blocks = re.findall(r':root\s*{([^}]*)}', all_css, re.IGNORECASE)
        for block in root_blocks:
            # Find --var: value;
            var_matches = re.findall(r'(--[^:]+):\s*([^;]+);', block)
            for var, val in var_matches:
                variables[var.strip()] = val.strip()
        return variables

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL provided"}))
        sys.exit(1)
        
    crawler = CSSCrawler(sys.argv[1])
    result = crawler.crawl()
    print(json.dumps(result))
