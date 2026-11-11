export function asyncHandler(handler) {
  return function handleAsync(request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}
