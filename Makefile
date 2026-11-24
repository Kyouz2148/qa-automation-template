.PHONY: setup validate test test-web test-api report k6-smoke k6-load clean

setup:
	npm ci
	npx playwright install --with-deps chromium
	@test -f .env || cp .env.example .env

validate:
	npm run validate

test:
	npm test

test-web:
	npm run test:web

test-api:
	npm run test:api

report:
	npm run report:html

k6-smoke:
	npm run k6:smoke

k6-load:
	npm run k6:load

clean:
	rm -rf reports test-results blob-report all-blob-reports playwright/.auth
