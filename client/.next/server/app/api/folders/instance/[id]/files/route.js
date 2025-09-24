/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/folders/instance/[id]/files/route";
exports.ids = ["app/api/folders/instance/[id]/files/route"];
exports.modules = {

/***/ "(rsc)/../node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute&page=%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute.ts&appDir=%2FUsers%2Fsanjayprajapati%2FDocuments%2FProject%2FTernus%2FBorrower%20Profile%2Fclient%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsanjayprajapati%2FDocuments%2FProject%2FTernus%2FBorrower%20Profile%2Fclient&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute&page=%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute.ts&appDir=%2FUsers%2Fsanjayprajapati%2FDocuments%2FProject%2FTernus%2FBorrower%20Profile%2Fclient%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsanjayprajapati%2FDocuments%2FProject%2FTernus%2FBorrower%20Profile%2Fclient&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/../node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/../node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/../node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_sanjayprajapati_Documents_Project_Ternus_Borrower_Profile_client_app_api_folders_instance_id_files_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/folders/instance/[id]/files/route.ts */ \"(rsc)/./app/api/folders/instance/[id]/files/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/folders/instance/[id]/files/route\",\n        pathname: \"/api/folders/instance/[id]/files\",\n        filename: \"route\",\n        bundlePath: \"app/api/folders/instance/[id]/files/route\"\n    },\n    resolvedPagePath: \"/Users/sanjayprajapati/Documents/Project/Ternus/Borrower Profile/client/app/api/folders/instance/[id]/files/route.ts\",\n    nextConfigOutput,\n    userland: _Users_sanjayprajapati_Documents_Project_Ternus_Borrower_Profile_client_app_api_folders_instance_id_files_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vbm9kZV9tb2R1bGVzL25leHQvZGlzdC9idWlsZC93ZWJwYWNrL2xvYWRlcnMvbmV4dC1hcHAtbG9hZGVyL2luZGV4LmpzP25hbWU9YXBwJTJGYXBpJTJGZm9sZGVycyUyRmluc3RhbmNlJTJGJTVCaWQlNUQlMkZmaWxlcyUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGZm9sZGVycyUyRmluc3RhbmNlJTJGJTVCaWQlNUQlMkZmaWxlcyUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmZvbGRlcnMlMkZpbnN0YW5jZSUyRiU1QmlkJTVEJTJGZmlsZXMlMkZyb3V0ZS50cyZhcHBEaXI9JTJGVXNlcnMlMkZzYW5qYXlwcmFqYXBhdGklMkZEb2N1bWVudHMlMkZQcm9qZWN0JTJGVGVybnVzJTJGQm9ycm93ZXIlMjBQcm9maWxlJTJGY2xpZW50JTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRnNhbmpheXByYWphcGF0aSUyRkRvY3VtZW50cyUyRlByb2plY3QlMkZUZXJudXMlMkZCb3Jyb3dlciUyMFByb2ZpbGUlMkZjbGllbnQmaXNEZXY9dHJ1ZSZ0c2NvbmZpZ1BhdGg9dHNjb25maWcuanNvbiZiYXNlUGF0aD0mYXNzZXRQcmVmaXg9Jm5leHRDb25maWdPdXRwdXQ9JnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQStGO0FBQ3ZDO0FBQ3FCO0FBQ29FO0FBQ2pKO0FBQ0E7QUFDQTtBQUNBLHdCQUF3Qix5R0FBbUI7QUFDM0M7QUFDQSxjQUFjLGtFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsc0RBQXNEO0FBQzlEO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQzBGOztBQUUxRiIsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCIvVXNlcnMvc2FuamF5cHJhamFwYXRpL0RvY3VtZW50cy9Qcm9qZWN0L1Rlcm51cy9Cb3Jyb3dlciBQcm9maWxlL2NsaWVudC9hcHAvYXBpL2ZvbGRlcnMvaW5zdGFuY2UvW2lkXS9maWxlcy9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvZm9sZGVycy9pbnN0YW5jZS9baWRdL2ZpbGVzL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvZm9sZGVycy9pbnN0YW5jZS9baWRdL2ZpbGVzXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9mb2xkZXJzL2luc3RhbmNlL1tpZF0vZmlsZXMvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvc2FuamF5cHJhamFwYXRpL0RvY3VtZW50cy9Qcm9qZWN0L1Rlcm51cy9Cb3Jyb3dlciBQcm9maWxlL2NsaWVudC9hcHAvYXBpL2ZvbGRlcnMvaW5zdGFuY2UvW2lkXS9maWxlcy9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcyB9ID0gcm91dGVNb2R1bGU7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHdvcmtBc3luY1N0b3JhZ2UsXG4gICAgICAgIHdvcmtVbml0QXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBwYXRjaEZldGNoLCAgfTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXBwLXJvdXRlLmpzLm1hcCJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/../node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute&page=%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute.ts&appDir=%2FUsers%2Fsanjayprajapati%2FDocuments%2FProject%2FTernus%2FBorrower%20Profile%2Fclient%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsanjayprajapati%2FDocuments%2FProject%2FTernus%2FBorrower%20Profile%2Fclient&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/../node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!*******************************************************************************************************!*\
  !*** ../node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \*******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(rsc)/./app/api/folders/instance/[id]/files/route.ts":
/*!******************************************************!*\
  !*** ./app/api/folders/instance/[id]/files/route.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/../node_modules/next/dist/api/server.js\");\n\nasync function GET(request, { params }) {\n    try {\n        const { id: instanceId } = await params;\n        if (!instanceId) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Instance ID is required'\n            }, {\n                status: 400\n            });\n        }\n        // Forward the request to the Python backend\n        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';\n        const response = await fetch(`${backendUrl}/api/folders/instance/${instanceId}/files`, {\n            method: 'GET',\n            headers: {\n                'Content-Type': 'application/json'\n            }\n        });\n        let data;\n        try {\n            data = await response.json();\n        } catch (error) {\n            console.error('Failed to parse JSON response:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Invalid response from server'\n            }, {\n                status: 500\n            });\n        }\n        if (!response.ok) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(data, {\n                status: response.status\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(data);\n    } catch (error) {\n        console.error('Error fetching folder files:', error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: 'Failed to fetch folder files'\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2ZvbGRlcnMvaW5zdGFuY2UvW2lkXS9maWxlcy9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7OztBQUF3RDtBQUVqRCxlQUFlQyxJQUNwQkMsT0FBb0IsRUFDcEIsRUFBRUMsTUFBTSxFQUF1QztJQUUvQyxJQUFJO1FBQ0YsTUFBTSxFQUFFQyxJQUFJQyxVQUFVLEVBQUUsR0FBRyxNQUFNRjtRQUVqQyxJQUFJLENBQUNFLFlBQVk7WUFDZixPQUFPTCxxREFBWUEsQ0FBQ00sSUFBSSxDQUN0QjtnQkFBRUMsT0FBTztZQUEwQixHQUNuQztnQkFBRUMsUUFBUTtZQUFJO1FBRWxCO1FBRUEsNENBQTRDO1FBQzVDLE1BQU1DLGFBQWFDLFFBQVFDLEdBQUcsQ0FBQ0MsV0FBVyxJQUFJO1FBQzlDLE1BQU1DLFdBQVcsTUFBTUMsTUFDckIsR0FBR0wsV0FBVyxzQkFBc0IsRUFBRUosV0FBVyxNQUFNLENBQUMsRUFDeEQ7WUFDRVUsUUFBUTtZQUNSQyxTQUFTO2dCQUNQLGdCQUFnQjtZQUNsQjtRQUNGO1FBR0YsSUFBSUM7UUFDSixJQUFJO1lBQ0ZBLE9BQU8sTUFBTUosU0FBU1AsSUFBSTtRQUM1QixFQUFFLE9BQU9DLE9BQU87WUFDZFcsUUFBUVgsS0FBSyxDQUFDLGtDQUFrQ0E7WUFDaEQsT0FBT1AscURBQVlBLENBQUNNLElBQUksQ0FDdEI7Z0JBQUVDLE9BQU87WUFBK0IsR0FDeEM7Z0JBQUVDLFFBQVE7WUFBSTtRQUVsQjtRQUVBLElBQUksQ0FBQ0ssU0FBU00sRUFBRSxFQUFFO1lBQ2hCLE9BQU9uQixxREFBWUEsQ0FBQ00sSUFBSSxDQUFDVyxNQUFNO2dCQUFFVCxRQUFRSyxTQUFTTCxNQUFNO1lBQUM7UUFDM0Q7UUFFQSxPQUFPUixxREFBWUEsQ0FBQ00sSUFBSSxDQUFDVztJQUMzQixFQUFFLE9BQU9WLE9BQU87UUFDZFcsUUFBUVgsS0FBSyxDQUFDLGdDQUFnQ0E7UUFDOUMsT0FBT1AscURBQVlBLENBQUNNLElBQUksQ0FDdEI7WUFBRUMsT0FBTztRQUErQixHQUN4QztZQUFFQyxRQUFRO1FBQUk7SUFFbEI7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL3NhbmpheXByYWphcGF0aS9Eb2N1bWVudHMvUHJvamVjdC9UZXJudXMvQm9ycm93ZXIgUHJvZmlsZS9jbGllbnQvYXBwL2FwaS9mb2xkZXJzL2luc3RhbmNlL1tpZF0vZmlsZXMvcm91dGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlcXVlc3QsIE5leHRSZXNwb25zZSB9IGZyb20gJ25leHQvc2VydmVyJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChcbiAgcmVxdWVzdDogTmV4dFJlcXVlc3QsXG4gIHsgcGFyYW1zIH06IHsgcGFyYW1zOiBQcm9taXNlPHsgaWQ6IHN0cmluZyB9PiB9XG4pIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGlkOiBpbnN0YW5jZUlkIH0gPSBhd2FpdCBwYXJhbXM7XG4gICAgXG4gICAgaWYgKCFpbnN0YW5jZUlkKSB7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXG4gICAgICAgIHsgZXJyb3I6ICdJbnN0YW5jZSBJRCBpcyByZXF1aXJlZCcgfSxcbiAgICAgICAgeyBzdGF0dXM6IDQwMCB9XG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIEZvcndhcmQgdGhlIHJlcXVlc3QgdG8gdGhlIFB5dGhvbiBiYWNrZW5kXG4gICAgY29uc3QgYmFja2VuZFVybCA9IHByb2Nlc3MuZW52LkJBQ0tFTkRfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXG4gICAgICBgJHtiYWNrZW5kVXJsfS9hcGkvZm9sZGVycy9pbnN0YW5jZS8ke2luc3RhbmNlSWR9L2ZpbGVzYCxcbiAgICAgIHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcblxuICAgIGxldCBkYXRhO1xuICAgIHRyeSB7XG4gICAgICBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgSlNPTiByZXNwb25zZTonLCBlcnJvcik7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXG4gICAgICAgIHsgZXJyb3I6ICdJbnZhbGlkIHJlc3BvbnNlIGZyb20gc2VydmVyJyB9LFxuICAgICAgICB7IHN0YXR1czogNTAwIH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKGRhdGEsIHsgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKGRhdGEpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIGZvbGRlciBmaWxlczonLCBlcnJvcik7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgeyBlcnJvcjogJ0ZhaWxlZCB0byBmZXRjaCBmb2xkZXIgZmlsZXMnIH0sXG4gICAgICB7IHN0YXR1czogNTAwIH1cbiAgICApO1xuICB9XG59XG5cbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJHRVQiLCJyZXF1ZXN0IiwicGFyYW1zIiwiaWQiLCJpbnN0YW5jZUlkIiwianNvbiIsImVycm9yIiwic3RhdHVzIiwiYmFja2VuZFVybCIsInByb2Nlc3MiLCJlbnYiLCJCQUNLRU5EX1VSTCIsInJlc3BvbnNlIiwiZmV0Y2giLCJtZXRob2QiLCJoZWFkZXJzIiwiZGF0YSIsImNvbnNvbGUiLCJvayJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/folders/instance/[id]/files/route.ts\n");

/***/ }),

/***/ "(ssr)/../node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!*******************************************************************************************************!*\
  !*** ../node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \*******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/../node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute&page=%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffolders%2Finstance%2F%5Bid%5D%2Ffiles%2Froute.ts&appDir=%2FUsers%2Fsanjayprajapati%2FDocuments%2FProject%2FTernus%2FBorrower%20Profile%2Fclient%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsanjayprajapati%2FDocuments%2FProject%2FTernus%2FBorrower%20Profile%2Fclient&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();