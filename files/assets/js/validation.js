// Allow only letters + spaces for these fields
const nameFields = ['first_name', 'middle_name', 'last_name'];

nameFields.forEach(id => {
    document.getElementById(id).addEventListener('input', function () {
        this.value = this.value.replace(/[^A-Za-z ]/g, '');
    });
});



// ===== Real-time Input Validation =====

// Allow letters + spaces only
function onlyLetters(input) {
    input.value = input.value.replace(/[^A-Za-z ]/g, '');
}

// Allow numbers only (for phone)
function onlyNumbers(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
}

// Allow basic email characters
function emailFilter(input) {
    input.value = input.value.replace(/[^A-Za-z0-9@._-]/g, '');
}

// Attach validation to existing and future contact entries
function attachContactValidation(container) {
    // Contacts
    container.querySelectorAll('input[name*="[name]"]').forEach(input => {
        input.addEventListener('input', () => onlyLetters(input));
    });

    container.querySelectorAll('input[name*="[relationship]"]').forEach(input => {
        input.addEventListener('input', () => onlyLetters(input));
    });

    container.querySelectorAll('input[name*="[phone]"]').forEach(input => {
        input.addEventListener('input', () => onlyNumbers(input));
    });

    container.querySelectorAll('input[name*="[email]"]').forEach(input => {
        input.addEventListener('input', () => emailFilter(input));
    });

    // Family Composition
    const familyFields = [
        'fatherLastName', 'fatherFirstName', 'fatherMiddleName', 'fatherExtension',
        'motherLastName', 'motherFirstName', 'motherMiddleName'
    ];

    familyFields.forEach(id => {
        const input = document.getElementById(id);
        if(input) {
            input.addEventListener('input', () => onlyLetters(input));
        }
    });
}

// Initial attach for default fields
attachContactValidation(document);

// When creating new contacts dynamically
document.getElementById('contactsContainer').addEventListener("DOMNodeInserted", function (e) {
    if (e.target.classList && e.target.classList.contains("contact-entry")) {
        attachContactValidation(e.target);
    }
});




// ===== Add Another Contact =====

let contactCount = 1;

document.getElementById("addContact").addEventListener("click", function () {
    contactCount++;

    const container = document.getElementById("contactsContainer");

    const newContact = document.createElement("div");
    newContact.classList.add("contact-entry");
    newContact.setAttribute("data-contact-id", contactCount);

    newContact.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Contact Type</label>
                <select class="contact-type" name="contacts[${contactCount}][type]" required>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="emergency">Emergency</option>
                </select>
            </div>
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" name="contacts[${contactCount}][name]" maxlength="25" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Relationship</label>
                <input type="text" name="contacts[${contactCount}][relationship]" maxlength="25">
            </div>
            <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" name="contacts[${contactCount}][phone]" maxlength="11" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Email Address</label>
                <input type="email" name="contacts[${contactCount}][email]" maxlength="25">
            </div>
            <div class="form-group">
                <button type="button" class="remove-contact">Remove</button>
            </div>
        </div>
    `;

    container.appendChild(newContact);

    // Apply validation for new fields
    attachContactValidation(newContact);

    // Remove button
    newContact.querySelector(".remove-contact").addEventListener("click", () => {
        newContact.remove();
    });
});
