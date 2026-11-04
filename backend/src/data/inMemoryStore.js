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
    delete(id) {
      const index = items.findIndex((entry) => entry.id === id);
      if (index === -1) return null;

      return structuredClone(items.splice(index, 1)[0]);
    },
  };
}

export const studentStore = createCollection(
  mockApiData.students.map(({ fullName, ...student }) => ({
    ...student,
    name: student.name ?? fullName,
  })),
);

export const courseStore = createCollection(mockApiData.courses);
