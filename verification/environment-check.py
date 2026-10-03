"""Record native-navigation availability separately from injected browser tests."""
import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  page=await browser.new_page()
  result={'browser':browser.version,'file':'diagram-studio.html','note':'This probe does not substitute for editor interaction tests.'}
  try:
   await page.goto((ROOT/'diagram-studio.html').as_uri(),wait_until='load',timeout=15000)
   await page.wait_for_function('window.diagramStudio?.diagnostics().ready',timeout=10000)
   result['nativeFileStartup']='passed'
  except Exception as error:
   result['nativeFileStartup']='blocked by environment' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(error) else 'failed'
   result['error']=str(error)
  await browser.close()
  (ROOT/'verification'/'environment-results.json').write_text(json.dumps(result,indent=2))
  print(json.dumps(result,indent=2))
asyncio.run(main())
