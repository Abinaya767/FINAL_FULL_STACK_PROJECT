const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9().\s-]+$/;
let formSequence = 0;

function getFormStatus(form) {
  let status = form.querySelector(".js-form-status");

  if (!status) {
    status = document.createElement("p");
    status.className = "js-form-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    form.append(status);
  }

  return status;
}

function getFieldError(form, field) {
  const errorId = `${form.dataset.validationId}-${field.name || field.id}`;
  let error = document.getElementById(errorId);

  if (!error) {
    error = document.createElement("small");
    error.id = errorId;
    error.className = "js-validation-message";
    error.setAttribute("role", "alert");
    field.insertAdjacentElement("afterend", error);
  }

  return error;
}

function showFieldError(form, field, message) {
  const error = getFieldError(form, field);
  error.textContent = message;
  field.setAttribute("aria-invalid", "true");

  const describedBy = new Set(
    (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean),
  );
  describedBy.add(error.id);
  field.setAttribute("aria-describedby", [...describedBy].join(" "));
}

function clearFieldError(form, field) {
  const errorId = `${form.dataset.validationId}-${field.name || field.id}`;
  document.getElementById(errorId)?.remove();
  field.removeAttribute("aria-invalid");

  const describedBy = (field.getAttribute("aria-describedby") || "")
    .split(/\s+/)
    .filter((id) => id && id !== errorId);

  if (describedBy.length) {
    field.setAttribute("aria-describedby", describedBy.join(" "));
  } else {
    field.removeAttribute("aria-describedby");
  }
}

function validateRequired(field, value) {
  if (field.required && !value.trim()) {
    return "This field is required.";
  }

  return "";
}

function validateEmail(field, value) {
  const requiredError = validateRequired(field, value);
  if (requiredError) {
    return requiredError;
  }

  return EMAIL_PATTERN.test(value.trim()) ? "" : "Enter a valid email address.";
}

function validateName(field, value) {
  const requiredError = validateRequired(field, value);
  if (requiredError) {
    return requiredError;
  }

  return value.trim().length >= 2 ? "" : "Enter at least 2 characters.";
}

function validatePhone(field, value) {
  const requiredError = validateRequired(field, value);
  if (requiredError) {
    return requiredError;
  }

  const digits = value.replace(/\D/g, "");
  return PHONE_PATTERN.test(value.trim()) && digits.length >= 7 && digits.length <= 15
    ? ""
    : "Enter a valid phone number with 7 to 15 digits.";
}

function validatePassword(field, value) {
  const requiredError = validateRequired(field, value);
  if (requiredError) {
    return requiredError;
  }

  return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(value)
    ? ""
    : "Use at least 8 characters with uppercase, lowercase, and a number.";
}

function attachValidation(form, fieldRules, onValid) {
  form.dataset.validationId = `learnspace-form-${++formSequence}`;
  form.noValidate = true;

  const fields = fieldRules.map(({ selector, validate }) => {
    const field = form.querySelector(selector);
    return field ? { field, validate } : null;
  }).filter(Boolean);

  if (!fields.length) {
    return;
  }

  fields.forEach(({ field, validate }) => {
    const recheck = () => {
      const message = validate(field, field.value);
      if (message) {
        showFieldError(form, field, message);
      } else {
        clearFieldError(form, field);
      }
    };

    field.addEventListener("input", recheck);
    field.addEventListener("change", recheck);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let isValid = true;

    fields.forEach(({ field, validate }) => {
      const message = validate(field, field.value);
      if (message) {
        showFieldError(form, field, message);
        isValid = false;
      } else {
        clearFieldError(form, field);
      }
    });

    const status = getFormStatus(form);
    if (!isValid) {
      status.textContent = "Please correct the highlighted fields.";
      status.dataset.state = "error";
      return;
    }

    try {
      status.textContent = onValid(form);
      status.dataset.state = "notice";
    } catch (error) {
      console.error("LearnSpace demo form state could not be updated.", error);
      status.textContent = "Your form is valid, but the demo state could not be saved in this browser session.";
      status.dataset.state = "error";
    }
  });
}

export function initializeFormValidation(handlers = {}) {
  const registrationForm = document.querySelector("form:has(#fullname):has(#confirm-password)");

  if (registrationForm) {
    const password = registrationForm.querySelector("#password");
    const confirmPassword = registrationForm.querySelector("#confirm-password");

    attachValidation(registrationForm, [
      { selector: "#fullname", validate: validateName },
      { selector: "#email", validate: validateEmail },
      { selector: "#phone", validate: validatePhone },
      { selector: "#college", validate: validateRequired },
      { selector: "#department", validate: validateRequired },
      { selector: "#year", validate: validateRequired },
      { selector: "#password", validate: validatePassword },
      {
        selector: "#confirm-password",
        validate: (_field, value) => {
          if (!value) {
            return "Please confirm your password.";
          }
          return value === password.value ? "" : "Passwords do not match.";
        },
      },
    ], handlers.onRegistrationValid || (() => "Registration demo is unavailable."));

    const validateConfirmation = () => {
      if (!confirmPassword.value) {
        return;
      }
      const message = confirmPassword.value === password.value ? "" : "Passwords do not match.";
      if (message) {
        showFieldError(registrationForm, confirmPassword, message);
      } else {
        clearFieldError(registrationForm, confirmPassword);
      }
    };

    confirmPassword.addEventListener("input", validateConfirmation);
    password.addEventListener("input", validateConfirmation);
  }

  const loginForm = document.querySelector("form:has(#email):has(#password)");
  if (loginForm && !registrationForm?.isSameNode(loginForm)) {
    attachValidation(loginForm, [
      { selector: "#email", validate: validateEmail },
      { selector: "#password", validate: validateRequired },
    ], handlers.onLoginValid || (() => "Login demo is unavailable."));
  }

  const adminLoginForm = document.querySelector("form:has(#admin-email):has(#admin-password)");
  if (adminLoginForm) {
    attachValidation(adminLoginForm, [
      { selector: "#admin-email", validate: validateEmail },
      { selector: "#admin-password", validate: validateRequired },
    ], () => "Admin authentication is not connected. No login was performed.");
  }

  document.querySelectorAll('form [name="studentName"]').forEach((nameField) => {
    const form = nameField.form;
    if (!form?.querySelector('[name="registeredEmail"]')) {
      return;
    }

    attachValidation(form, [
      { selector: '[name="studentName"]', validate: validateName },
      { selector: '[name="registeredEmail"]', validate: validateEmail },
    ], handlers.onEnrollmentValid || (() => "Enrollment demo is unavailable."));
  });
}
