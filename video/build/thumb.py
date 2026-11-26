import asyncio, pathlib, json
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent.resolve()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 3840, 'height': 2160})
        await pg.goto((HERE / 'page.html').as_uri())
        await pg.evaluate("""() => { const c=document.getElementById('c'); const g=c.getContext('2d');
          renderFrame({kind:'drawn', scene:'chain', t:12.5});
          // darken nothing; add a headline band
          g.fillStyle='#F7F8F9'; g.fillRect(0,0,3840,560);
          g.fillStyle='#172B4D'; g.font='800 230px "Segoe UI Variable Display","Segoe UI",sans-serif'; g.fillText('Fail your audit in private', 240, 330);
          g.fillStyle='#44546F'; g.font='500 110px "Segoe UI",sans-serif'; g.fillText('Walkdown · a practice auditor inside Jira', 250, 490); }""")
        await pg.locator('#c').screenshot(path=str(HERE.parent / 'work' / 'thumb4k.png'))
        await b.close()
asyncio.run(main())
