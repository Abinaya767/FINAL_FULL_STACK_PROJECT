export default function requestLogger(request, response, next) {
  const startedAt = Date.now();
  response.on("finish", () => {
    console.info(`${request.method} ${request.path} ${response.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
}
