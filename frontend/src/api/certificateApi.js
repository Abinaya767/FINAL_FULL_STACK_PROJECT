import { expressRequest } from "./expressApi.js";

export async function getCertificates() {
  const result = await expressRequest("/certificates");
  return result.data.certificates;
}

export async function getCertificate(id) {
  const result = await expressRequest(`/certificates/${encodeURIComponent(id)}`);
  return result.data.certificate;
}
