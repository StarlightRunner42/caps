// Allow letters + spaces only
function onlyLetters(input) {
    input.value = input.value.replace(/[^A-Za-z ]/g, '');
}

// Personal Information fields
const personalFields = ['first_name', 'middle_name', 'last_name'];

personalFields.forEach(id => {
    const input = document.getElementById(id);
    if(input) {
        input.addEventListener('input', () => onlyLetters(input));
    }
});