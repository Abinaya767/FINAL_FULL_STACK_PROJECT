import { getStudent, updateStudent } from "../src/api/studentApi.js";
import { getAuthSession } from "../src/api/authSession.js";

const byId = (id) => document.getElementById(id);
const displayValue = (value) => value === undefined || value === null || value === "" ? "—" : String(value);

function initials(name = "Student") {
  return name.trim().split(/\\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "S";
}

function renderProfileSummary(student) {
  const name = student.name || "Student";
  const avatar = student.avatarData || "";
  const triggerInitials = byId("student-profile-trigger-initials");
  const triggerImage = byId("student-profile-trigger-image");
  const menuInitials = byId("student-profile-initials");
  const menuImage = byId("student-profile-image");
  const letters = initials(name);
  if (triggerInitials) { triggerInitials.textContent = letters; triggerInitials.hidden = Boolean(avatar); }
  if (triggerImage) { triggerImage.src = avatar; triggerImage.hidden = !avatar; }
  if (menuInitials) { menuInitials.textContent = letters; menuInitials.hidden = Boolean(avatar); }
  if (menuImage) { menuImage.src = avatar; menuImage.hidden = !avatar; }
  const values = {
    "student-profile-display-name": name,
    "student-profile-display-email": student.email,
    "student-profile-display-phone": displayValue(student.phone),
    "student-profile-display-college": displayValue(student.college),
    "student-profile-display-department": displayValue(student.department),
    "student-profile-display-year": displayValue(student.yearOfStudy),
  };
  for (const [id, value] of Object.entries(values)) {
    const element = byId(id);
    if (element) element.textContent = value;
  }
}

function createCompressedPhoto(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      const sx = (image.naturalWidth - side) / 2;
      const sy = (image.naturalHeight - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) { reject(new Error("Your browser could not process this image.")); return; }
      context.drawImage(image, sx, sy, side, side, 0, 0, 256, 256);
      let data = canvas.toDataURL("image/jpeg", 0.82);
      if (data.length > 110000) data = canvas.toDataURL("image/jpeg", 0.68);
      if (data.length > 120000) { reject(new Error("Please choose a smaller or simpler photo.")); return; }
      resolve(data);
    };
    image.onerror = () => { URL.revokeObjectURL(imageUrl); reject(new Error("This image could not be opened.")); };
    image.src = imageUrl;
  });
}

export async function initializeStudentProfile() {
  const form = document.querySelector("#student-profile-form");
  const trigger = byId("student-profile-trigger");
  const menu = byId("student-profile-menu");
  const photoInput = byId("student-profile-photo");
  const photoStatus = byId("student-profile-photo-status");
  const session = getAuthSession();
  let savedStudent = null;

  if (trigger && menu) {
    trigger.addEventListener("click", () => {
      const opening = menu.hidden;
      menu.hidden = !opening;
      trigger.setAttribute("aria-expanded", String(opening));
    });
    document.addEventListener("click", (event) => {
      if (!menu.hidden && !menu.contains(event.target) && !trigger.contains(event.target)) {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      }
    });
    byId("student-profile-edit-link")?.addEventListener("click", () => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    });
  }

  if (!session?.user?.id) {
    const status = form?.querySelector(".api-status");
    if (status) { status.textContent = "Sign in again to view your student profile."; status.dataset.state = "error"; }
    return;
  }

  const status = form?.querySelector(".api-status") || (form ? document.createElement("p") : null);
  if (status && form && !status.isConnected) { status.className = "api-status"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite"); form.append(status); }
  const name = form?.elements.namedItem("name");
  const phone = form?.elements.namedItem("phone");
  const college = form?.elements.namedItem("college");
  const department = form?.elements.namedItem("department");
  const yearOfStudy = form?.elements.namedItem("yearOfStudy");
  const submit = form?.querySelector('button[type="submit"]');
  if (status) { status.textContent = "Loading your saved profile..."; status.dataset.state = "loading"; }
  if (submit) submit.disabled = true;

  try {
    savedStudent = await getStudent(session.user.id);
    renderProfileSummary(savedStudent);
    if (name) name.value = savedStudent.name || "";
    if (phone) phone.value = savedStudent.phone || "";
    if (college) college.value = savedStudent.college || "";
    if (department) department.value = savedStudent.department || "";
    if (yearOfStudy) yearOfStudy.value = savedStudent.yearOfStudy ?? "";
    if (status) status.textContent = "";

    if (form) form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submit) submit.disabled = true;
      if (status) { status.textContent = "Saving your profile..."; status.dataset.state = "loading"; }
      try {
        const updated = await updateStudent(session.user.id, {
          name: name.value.trim(), phone: phone.value.trim(), college: college.value.trim(),
          department: department.value.trim(), ...(yearOfStudy.value ? { yearOfStudy: Number(yearOfStudy.value) } : {}),
        });
        savedStudent = { ...savedStudent, ...updated };
        renderProfileSummary(savedStudent);
        const welcome = [...document.querySelectorAll("main > section")]
          .find((section) => section.querySelector("h2")?.textContent.trim().startsWith("Welcome"));
        if (welcome) welcome.querySelector("h2").textContent = "Welcome, " + updated.name + "!";
        if (status) { status.textContent = "Profile changes saved."; status.dataset.state = "success"; }
      } catch (error) {
        if (status) { status.textContent = error.message; status.dataset.state = "error"; }
      } finally { if (submit) submit.disabled = false; }
    });
  } catch (error) {
    if (status) { status.textContent = error.message; status.dataset.state = "error"; }
    if (photoStatus) { photoStatus.textContent = error.message; photoStatus.dataset.state = "error"; }
  } finally { if (submit) submit.disabled = false; }

  if (photoInput) photoInput.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      if (photoStatus) { photoStatus.textContent = "Choose a JPG, PNG or WEBP image."; photoStatus.dataset.state = "error"; }
      photoInput.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      if (photoStatus) { photoStatus.textContent = "Photo must be 5 MB or smaller."; photoStatus.dataset.state = "error"; }
      photoInput.value = "";
      return;
    }
    const uploadLabel = photoInput.closest("label");
    if (uploadLabel) uploadLabel.style.pointerEvents = "none";
    if (photoStatus) { photoStatus.textContent = "Saving your profile photo..."; photoStatus.dataset.state = "loading"; }
    try {
      const avatarData = await createCompressedPhoto(file);
      const updated = await updateStudent(session.user.id, { avatarData });
      savedStudent = { ...savedStudent, ...updated };
      renderProfileSummary(savedStudent);
      if (photoStatus) { photoStatus.textContent = "Profile photo saved."; photoStatus.dataset.state = "success"; }
    } catch (error) {
      if (photoStatus) { photoStatus.textContent = error.message; photoStatus.dataset.state = "error"; }
    } finally {
      if (uploadLabel) uploadLabel.style.pointerEvents = "";
      photoInput.value = "";
    }
  });
}
