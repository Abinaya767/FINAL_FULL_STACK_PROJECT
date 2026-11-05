import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const mockApiData = JSON.parse(readFileSync(new URL("./seedData.json", import.meta.url), "utf8"));

function createCollection(initialItems) {
  const items = structuredClone(initialItems);

  return {
    list() {
      return structuredClone(items);
    },
    findById(id) {
      const item = items.find((entry) => entry.id === id);
      return item ? structuredClone(item) : null;
    },
    create(fields) {
      const item = { id: randomUUID(), ...fields };
      items.push(item);
      return structuredClone(item);
    },
    update(id, fields) {
      const index = items.findIndex((entry) => entry.id === id);
      if (index === -1) return null;

      items[index] = { ...items[index], ...fields, id };
      return structuredClone(items[index]);
    },
    replace(id, fields) {
      const index = items.findIndex((entry) => entry.id === id);
      if (index === -1) return null;

      items[index] = { ...fields, id };
      return structuredClone(items[index]);
    },
    delete(id) {
      const index = items.findIndex((entry) => entry.id === id);
      if (index === -1) return null;

      return structuredClone(items.splice(index, 1)[0]);
    },
  };
}

export const studentStore = createCollection(
  mockApiData.students.map(({ fullName, course, ...student }) => ({
    ...student,
    name: student.name ?? fullName,
    enrolledCourses: student.enrolledCourses ?? (course ? [course] : []),
  })),
);

export const courseStore = createCollection(
  mockApiData.courses.map((course) => ({
    ...course,
    level: course.level ?? "Not specified",
  })),
);

const developmentCredentials = new Map();

export const credentialStore = {
  set(email, password) {
    developmentCredentials.set(email, password);
  },
  matches(email, password) {
    return developmentCredentials.get(email) === password;
  },
};
