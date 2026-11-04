import { apiResponse } from "../utils/apiResponse.js";

export function welcome(_request, response) {
  response.status(200).json(apiResponse("Welcome to the LearnSpace backend.", {
    service: "LearnSpace API",
  }));
}

export function health(_request, response) {
  response.status(200).json(apiResponse("LearnSpace backend is healthy.", {
    status: "ok",
    timestamp: new Date().toISOString(),
  }));
}

export function test(_request, response) {
  response.status(200).json(apiResponse("LearnSpace backend test succeeded.", {
    test: "passed",
  }));
}
