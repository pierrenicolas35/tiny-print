from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://localhost:8000")

    page.fill("#inputNom", "DUPONT")
    page.fill("#inputPrenom", "Jean-Pierre")
    page.fill("#inputDateNaissance", "01/02/1980")
    page.fill("#inputMotif", "Ceci est un motif très long pour vérifier la seconde ligne")

    page.wait_for_timeout(1000)

    element = page.locator("#labelCanvas")
    element.screenshot(path="screenshot_test.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
