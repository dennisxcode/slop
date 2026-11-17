"""Renders assets/tiers/src/*.svg -> assets/tiers/*.png (needs: pip install playwright && playwright install chromium)."""
import asyncio, glob, os
from playwright.async_api import async_playwright

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "tiers")


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 640, "height": 640})
        for svg in sorted(glob.glob(os.path.join(ROOT, "src", "*.svg"))):
            await pg.goto("file://" + os.path.abspath(svg))
            out = os.path.join(ROOT, os.path.basename(svg).replace(".svg", ".png"))
            await pg.screenshot(path=out, omit_background=True)
            print("rendered", os.path.normpath(out))
        await b.close()

asyncio.run(main())
