# Tasks

- [x] Task 1: Implement Cache-Busting in fetchApi
  - [x] SubTask 1.1: Open `src/utils/apiClient.ts`.
  - [x] SubTask 1.2: Check if the `options.method` is `GET` (or not defined, meaning `GET` by default).
  - [x] SubTask 1.3: If it is a `GET` request, append `_t=${Date.now()}` to the `url` to ensure the browser does not cache the request.
  - [x] SubTask 1.4: Additionally, set `Cache-Control: no-cache` in the headers.

- [x] Task 2: Verify Product Update Flow
  - [x] SubTask 2.1: Instruct the user to perform a hard refresh in their browser to clear the existing Single Page Application (SPA) cache and load the new script bundle.
