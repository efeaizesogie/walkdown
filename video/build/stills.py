# python stills.py out_dir scene:t scene:t ...   (drawn scenes only)
import sys, json, pathlib, asyncio
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent.resolve()
async def main():
    out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    data = {"summary": json.load(open(HERE.parent/'mcp-glu6.json'))['summary']}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--allow-file-access-from-files'])
        pg = await b.new_page(viewport={'width':3840,'height':2160})
        pg.on('console', lambda m: print('console:', m.text))
        pg.on('pageerror', lambda e: print('pageerror:', e))
        await pg.goto((HERE/'page.html').as_uri())
        for spec in sys.argv[2:]:
            s, t = spec.split(':')
            await pg.evaluate("([s,t,d])=>renderFrame({kind:'drawn',scene:s,t:+t,data:d})", [s, t, data])
            f = out/f"{s}_{float(t):05.1f}.jpg"
            await pg.locator('#c').screenshot(path=str(f), type='jpeg', quality=85)
            print(f)
        await b.close()
asyncio.run(main())
