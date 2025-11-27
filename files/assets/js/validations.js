(() => {
  // =======================
  // Config / Regex
  // =======================
  const LETTERS_ONLY_REGEX = /^[A-Za-z ]+$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[0-9]{11}$/;

  // =======================
  // Utility: Validation helpers
  // =======================
  function attachLettersOnly(el) {
    if (!el) return;
    el.addEventListener('input', () => {
      const cleaned = el.value.replace(/[^A-Za-z ]+/g, '');
      if (el.value !== cleaned) el.value = cleaned;
      el.setCustomValidity(
        el.value.trim() === '' || LETTERS_ONLY_REGEX.test(el.value)
          ? '' : 'Letters and spaces only'
      );
    });
    el.addEventListener('blur', () => el.reportValidity());
    // add a native title hint
    if (!el.title) el.title = 'Letters and spaces only';
  }

  function attachPhone11(el) {
    if (!el) return;
    // attributes for progressive enhancement
    el.setAttribute('inputmode', 'numeric');
    el.setAttribute('maxlength', '11');
    el.setAttribute('pattern', '[0-9]{11}');
    el.setAttribute('title', 'Please enter exactly 11 digits');

    el.addEventListener('input', () => {
      const digits = el.value.replace(/\D+/g, '').slice(0, 11);
      if (el.value !== digits) el.value = digits;
      el.setCustomValidity(PHONE_REGEX.test(el.value) ? '' : 'Please enter exactly 11 digits');
    });
    el.addEventListener('blur', () => el.reportValidity());
  }

  function attachEmail(el) {
    if (!el) return;
    el.setAttribute('maxlength', el.getAttribute('maxlength') || '50');
    el.setAttribute('pattern', '[^@\\s]+@[^@\\s]+\\.[^@\\s]+');
    el.setAttribute('title', 'Please enter a valid email (must contain @ and a domain)');

    el.addEventListener('input', () => {
      el.setCustomValidity(EMAIL_REGEX.test(el.value) ? '' : 'Please enter a valid email');
    });
    el.addEventListener('blur', () => el.reportValidity());
  }

  function clearInputs(container) {
    container.querySelectorAll('input').forEach(i => {
      if (i.type === 'checkbox' || i.type === 'radio') {
        i.checked = false;
      } else {
        i.value = '';
      }
    });
    container.querySelectorAll('select').forEach(s => {
      // keep first option or "Select"
      if (s.options.length) s.selectedIndex = 0;
    });
  }

  // =======================
  // Personal Info: attach letters-only to name-like fields
  // (Place of Birth is intentionally excluded)
  // =======================
  const lettersOnlyIds = [
    '#first_name', '#middle_name', '#last_name',
    '#spouse_name',
    '#fatherLastName', '#fatherFirstName', '#fatherMiddleName', '#fatherExtension',
    '#motherLastName', '#motherFirstName', '#motherMiddleName',
    '#service' // "Service/Business/Employment (specify)" — per your rule: letters-only
  ];

  lettersOnlyIds.forEach(sel => attachLettersOnly(document.querySelector(sel)));

  // Special: the Religion field in your markup is the FIRST occurrence of id="place_of_birth".
  // It should be letters-only. To avoid ID conflict issues, target it by its placeholder "Religion".
  const religionInput = document.querySelector('input[placeholder="Religion"]');
  if (religionInput) attachLettersOnly(religionInput);

  // Leave "Place of Birth" (the second one) unrestricted:
  // It usually has placeholder "Place of Birth" — do nothing.

  // =======================
  // Contacts: add/clone/remove & validations
  // =======================
  const contactsContainer = document.getElementById('contactsContainer');
  const addContactBtn = document.getElementById('addContact');

  function nextContactId() {
    const ids = [...contactsContainer.querySelectorAll('.contact-entry')]
      .map(block => Number(block.dataset.contactId || '0'));
    return (ids.length ? Math.max(...ids) : 0) + 1;
  }

  function setContactNames(block, id) {
    const type = block.querySelector('.contact-type');
    const name = block.querySelector('input[name$="[name]"]');
    const rel  = block.querySelector('input[name$="[relationship]"]');
    const phone= block.querySelector('input[name$="[phone]"]');
    const email= block.querySelector('input[name$="[email]"]');

    if (type)  type.name  = `contacts[${id}][type]`;
    if (name)  name.name  = `contacts[${id}][name]`;
    if (rel)   rel.name   = `contacts[${id}][relationship]`;
    if (phone) phone.name = `contacts[${id}][phone]`;
    if (email) email.name = `contacts[${id}][email]`;
    block.dataset.contactId = String(id);
  }

  function wireContactValidation(block) {
    // letters-only for name & relationship
    attachLettersOnly(block.querySelector('input[name$="[name]"]'));
    attachLettersOnly(block.querySelector('input[name$="[relationship]"]'));

    // phone and email rules
    attachPhone11(block.querySelector('input[name$="[phone]"]'));
    attachEmail(block.querySelector('input[name$="[email]"]'));
  }

  function refreshContactRemoveStates() {
    const entries = contactsContainer.querySelectorAll('.contact-entry');
    entries.forEach((block, idx) => {
      const btn = block.querySelector('.delete-child');
      if (btn) btn.disabled = (idx === 0); // first cannot be removed
    });
  }

  function wireContactRemove(block) {
    const btn = block.querySelector('.delete-child');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const blocks = contactsContainer.querySelectorAll('.contact-entry');
      if (blocks.length <= 1) return; // protect when only one remains
      block.remove();
      refreshContactRemoveStates();
    });
  }

  // init first contact block
  (function initContacts() {
    if (!contactsContainer) return;
    const first = contactsContainer.querySelector('.contact-entry');
    if (!first) return;
    if (!first.dataset.contactId) first.dataset.contactId = '1';
    wireContactValidation(first);
    wireContactRemove(first);
    refreshContactRemoveStates();
  })();

  // add new contact
  if (addContactBtn) {
    addContactBtn.addEventListener('click', () => {
      const template = contactsContainer.querySelector('.contact-entry');
      if (!template) return;

      const clone = template.cloneNode(true);
      clearInputs(clone);
      const newId = nextContactId();
      setContactNames(clone, newId);
      wireContactValidation(clone);
      wireContactRemove(clone);
      contactsContainer.appendChild(clone);
      refreshContactRemoveStates();
    });
  }

  // =======================
  // Children: add/clone/remove & validations
  // =======================
  const childrenContainer = document.getElementById('childrenContainer');
  const addChildBtn = document.getElementById('addChild');

  function wireChildValidation(block) {
    attachLettersOnly(block.querySelector('input[name="childFullName[]"]'));
    attachLettersOnly(block.querySelector('input[name="childOccupation[]"]'));
    // Age & Income are type="number" already; add min constraints if you want:
    const age = block.querySelector('input[name="childAge[]"]');
    const income = block.querySelector('input[name="childIncome[]"]');
    if (age) { age.min = '0'; age.max = '120'; }
    if (income) { income.min = '0'; }
  }

  function wireChildRemoveButton(block) {
    const btn = block.querySelector('.delete-child');
    if (!btn) return;
    btn.style.display = ''; // show on clones
    btn.addEventListener('click', () => {
      const entries = childrenContainer.querySelectorAll('.child-entry');
      if (entries.length <= 1) return; // protect the first row
      block.remove();
      refreshChildRemoveStates();
    });
  }

  function refreshChildRemoveStates() {
    const entries = childrenContainer.querySelectorAll('.child-entry');
    entries.forEach((entry, idx) => {
      const btn = entry.querySelector('.delete-child');
      if (btn) btn.style.display = (idx === 0 ? 'none' : '');
    });
  }

  (function initChildren() {
    if (!childrenContainer) return;
    const firstChild = childrenContainer.querySelector('.child-entry');
    if (!firstChild) return;
    wireChildValidation(firstChild);
    refreshChildRemoveStates();
    // ensure a handler exists (won't show on first)
    wireChildRemoveButton(firstChild);
  })();

  if (addChildBtn) {
    addChildBtn.addEventListener('click', () => {
      const template = childrenContainer.querySelector('.child-entry');
      if (!template) return;
      const clone = template.cloneNode(true);
      clearInputs(clone);
      wireChildValidation(clone);
      childrenContainer.appendChild(clone);
      wireChildRemoveButton(clone);
      refreshChildRemoveStates();
    });
  }

  // =======================
  // Existing hooks you referenced
  // =======================
  // Age calculator based on birthday
  window.calculateAge = function calculateAge() {
    const bdayEl = document.getElementById('birthday');
    const ageEl  = document.getElementById('age');
    if (!bdayEl || !ageEl || !bdayEl.value) return;

    const today = new Date();
    const birth = new Date(bdayEl.value + 'T00:00:00');
    if (isNaN(birth.getTime())) return;

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    ageEl.value = isFinite(age) && age >= 0 ? age : '';
  };

  // Show spouse input only if "Married"
  window.toggleSpouseInput = function toggleSpouseInput() {
    const sel = document.getElementById('civil_status');
    const group = document.getElementById('spouseGroup');
    if (!sel || !group) return;
    group.style.display = sel.value === 'Married' ? '' : 'none';
  };

  // Run once on load to reflect defaults
  window.toggleSpouseInput();

  // =======================
  // Final pass: attach letters-only to any remaining generic fields
  // (avoiding Place of Birth by placeholder)
  // =======================
  document.querySelectorAll('input[type="text"]').forEach(input => {
    const ph = (input.getAttribute('placeholder') || '').toLowerCase();
    // Skip known exceptions
    if (ph.includes('place of birth')) return;
    if (input.name && /\b(email|phone)\b/i.test(input.name)) return;
    if (ph.includes('email') || ph.includes('phone')) return;

    // Attach letters-only to anything else that's text-like,
    // unless it's obviously not a name-like field.
    const shouldAttach =
      ph.includes('name') ||
      ph.includes('occupation') ||
      ph.includes('service') ||
      ph.includes('extension') ||
      ph.includes('religion') ||
      input.id === 'service';

    if (shouldAttach) attachLettersOnly(input);
  });
})();
