#!/usr/bin/env python3
"""Open the Lifestyle Migration preview locally, using Python's standard library."""
import argparse
import json
import gzip
import io
import ipaddress
from urllib.parse import urlsplit
from research_collector import Collector
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser


class PreviewHandler(SimpleHTTPRequestHandler):
    """Compress the bundled data scripts for private-network previews."""
    compressed = {}

    collector = None

    def log_message(self, format, *args):
        # Do not retain visitor IP addresses, query strings or browser information.
        pass

    def json_response(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        return io.BytesIO(body)

    def do_POST(self):
        route = urlsplit(self.path).path
        if route != "/api/research/contributions" or self.collector is None:
            self.wfile.write(self.json_response(404, {"saved": False, "message": "Collection is not enabled."}).read()); return
        try:
            origin = urlsplit(self.headers.get("Origin", ""))
            if origin.scheme != "http" or origin.netloc != self.headers.get("Host") or origin.path or origin.query or origin.fragment:
                raise ValueError("A same-origin browser submission is required.")
            if self.headers.get("Content-Type", "").split(";", 1)[0] != "application/json":raise ValueError("Expected JSON.")
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 65536:raise ValueError("The record is too large or empty.")
            self.connection.settimeout(15)
            record = json.loads(self.rfile.read(length))
            receipt = self.collector.save(record)
            result = self.json_response(201, {"saved": True, "record_id": receipt})
        except (ValueError, TypeError, KeyError, OverflowError, OSError):
            result = self.json_response(400, {"saved": False, "message": "The record was not saved. Check consent, fields and residence shares, then retry."})
        self.wfile.write(result.read())

    def send_head(self):
        route = urlsplit(self.path).path
        if route == "/api/research/status":
            return self.json_response(200, {"enabled": self.collector is not None, "schema_version": 1})
        if route.startswith("/api/"):
            return self.json_response(404, {"message": "No public research-data download endpoint."})
        resolved = Path(self.translate_path(route)).resolve()
        site = Path(self.directory).resolve()
        if resolved != site and site not in resolved.parents:
            self.send_error(403); return None

        path = Path(self.translate_path(urlsplit(self.path).path))
        if "gzip" in self.headers.get("Accept-Encoding", "") and path.is_file() and path.suffix == ".js" and path.stat().st_size > 100_000:
            signature = (str(path), path.stat().st_mtime_ns)
            cache = type(self).compressed
            body = cache.get(signature)
            if body is None:
                body = gzip.compress(path.read_bytes(), compresslevel=6)
                for key in list(cache):
                    if key[0] == str(path):
                        cache.pop(key, None)
                cache[signature] = body
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Vary", "Accept-Encoding")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return io.BytesIO(body)
        return super().send_head()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-only", action="store_true", help="Check package files and exit.")
    parser.add_argument("--no-browser", action="store_true", help="Print the local URL without opening a browser.")
    parser.add_argument("--host", default="127.0.0.1", help="Loopback or a reachable private IP.")
    parser.add_argument("--port", type=int, default=0, help="Port (default: an available local port).")
    parser.add_argument("--collect-research", action="store_true", help="Enable explicit voluntary submissions on this private preview.")
    parser.add_argument("--research-dir", type=Path, help="Private records folder outside the website root.")
    args = parser.parse_args()
    address = ipaddress.ip_address(args.host)
    if address.is_unspecified or not (address.is_loopback or address.is_private or address in ipaddress.ip_network("100.64.0.0/10")):
        parser.error("Use a loopback or private-network address.")
    if not 0 <= args.port <= 65535:
        parser.error("Port must be between 0 and 65535.")
    site = Path(__file__).resolve().parent
    required = (
        "index.html", "patterns.html", "compare.html", "track.html", "move.html", "migration.html", "evidence.html", "appendix.html", "validation.html", "copyright.html", "assets/appendices.css", "assets/validation.js", "assets/validation-data.js", "papers/Moving_for_a_New_Lifestyle_2026-11-24.pdf", "papers/Moving_for_a_New_Lifestyle_2026-11-24.docx", "assets/style.css", "assets/app.js",
        "assets/track.js", "assets/move.js", "assets/workflow-ui.js", "assets/workflows.css",
        "assets/profile-engine.js", "assets/profile-worker.js", "assets/profile-runner.js",
        "assets/boot.js", "assets/msa-registry.js", "citation.bib",
        "assets/migration.css", "migration-methods.md", "downloads/migration_results.json",
        "assets/move-constraints.js", "downloads/msa_population_regions_2022.csv",
        "assets/patterns.css", "assets/patterns.js", "assets/pattern-data.js",
        "assets/map-data.js", "assets/metro-map.js",
        "assets/predictor.js", "assets/model-data.js", "model-definition.md",
    )
    for name in required:
        if not (site / name).is_file():
            raise SystemExit("Missing website file: " + name)
    # Verify all locally bundled lazy data chunks, including an extracted offline package.
    import json
    script = (site / "assets/pattern-data.js").read_text()
    payload = json.loads(script.split("=", 1)[1].strip().rstrip(";"))
    for name in payload.get("chunkFiles", {}).values():
        if not (site / name).is_file():
            raise SystemExit("Missing pattern data chunk: " + name)
    evidence = json.loads((site / "downloads/migration_results.json").read_text())
    for spec in evidence["specifications"]:
        if not (site / spec["download"]).is_file():
            raise SystemExit("Missing migration coefficient download: " + spec["download"])
    if args.check_only:
        print("Lifestyle Migration preview package is complete.")
        return
    if args.collect_research:
        directory = args.research_dir or site.parent / "research_contributions"
        try:PreviewHandler.collector = Collector(site, directory)
        except ValueError as error:parser.error(str(error))
        print("Opt-in research records: " + str(PreviewHandler.collector.directory), flush=True)
    handler = partial(PreviewHandler, directory=str(site))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    url = f"http://{args.host}:{server.server_port}/index.html"
    print("Lifestyle Migration local preview: " + url, flush=True)
    print("Keep this terminal open. Press Ctrl+C to stop.", flush=True)
    timer = None
    if not args.no_browser:
        timer = threading.Timer(0.5, lambda: webbrowser.open(url))
        timer.daemon = True
        timer.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if timer is not None:
            timer.cancel()
        server.server_close()


if __name__ == "__main__":
    main()
