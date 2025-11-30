// Tab switching functionality
const tabs = document.querySelectorAll('.tab');
const forms = document.querySelectorAll('.form-container');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.id.replace('tab-', 'form-');
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding form
        forms.forEach(form => {
            form.classList.remove('active');
            if (form.id === target) {
                form.classList.add('active');
            }
        });
    });
});

// Function to load barangays and update dropdown and list
async function loadBarangays() {
    try {
        const response = await fetch('/api/barangays', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch barangays');
        }

        const data = await response.json();
        
        if (data.success) {
            // Update barangay dropdown
            const selectBarangay = document.getElementById('selectBarangay');
            selectBarangay.innerHTML = '<option value="" disabled selected>-- Select Barangay --</option>';
            
            if (data.barangayList && data.barangayList.length > 0) {
                data.barangayList.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item._id;
                    option.textContent = item.barangay;
                    selectBarangay.appendChild(option);
                });
            }

            // Update barangay list display
            const barangayListContainer = document.getElementById('barangayList');
            if (data.barangayList && data.barangayList.length > 0) {
                barangayListContainer.innerHTML = data.barangayList.map(item => {
                    const puroksHtml = item.puroks && item.puroks.length > 0
                        ? `<div style="font-size: 14px; color: #666; margin-bottom: 5px;">Puroks:</div>
                           <ul style="margin: 0; padding-left: 20px; color: #555;">
                               ${item.puroks.map(purok => `<li>${purok}</li>`).join('')}
                           </ul>`
                        : '<div style="font-size: 14px; color: #999; font-style: italic;">No puroks added yet</div>';
                    
                    return `<div class="barangay-item" style="margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background: #f9f9f9;">
                                <div style="font-weight: 600; font-size: 16px; margin-bottom: 10px; color: #333;">
                                    ${item.barangay}
                                </div>
                                <div style="margin-left: 15px;">
                                    ${puroksHtml}
                                </div>
                            </div>`;
                }).join('');
            } else {
                barangayListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; font-style: italic;">No barangays registered yet</div>';
            }
        }
    } catch (error) {
        console.error('Error loading barangays:', error);
    }
}

// Form submission handler for registering barangay
document.getElementById('registerBarangay').addEventListener('submit', async function(e) {
    e.preventDefault();
    const barangayName = document.getElementById('barangayName').value.trim();
    
    if (!barangayName) {
        alert('Please enter a barangay name');
        return;
    }

    try {
        const response = await fetch('/api/barangay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ barangayName: barangayName })
        });

        const data = await response.json();

        if (data.success) {
            alert(`Barangay "${barangayName}" registered successfully!`);
            this.reset();
            // Reload barangays to update the list and dropdown
            await loadBarangays();
        } else {
            alert(data.message || 'Failed to register barangay');
        }
    } catch (error) {
        console.error('Error registering barangay:', error);
        alert('An error occurred while registering the barangay');
    }
});

// Form submission handler for adding purok
document.getElementById('registerPurok').addEventListener('submit', async function(e) {
    e.preventDefault();
    const selectBarangay = document.getElementById('selectBarangay');
    const barangayId = selectBarangay.value;
    const purokName = document.getElementById('purokName').value.trim();
    
    if (!barangayId) {
        alert('Please select a barangay');
        return;
    }

    if (!purokName) {
        alert('Please enter a purok name');
        return;
    }

    try {
        const response = await fetch('/api/purok', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ 
                barangayId: barangayId,
                purokName: purokName 
            })
        });

        const data = await response.json();

        if (data.success) {
            const barangayName = selectBarangay.options[selectBarangay.selectedIndex].text;
            alert(`Purok "${purokName}" added to ${barangayName} successfully!`);
            this.reset();
            // Reload barangays to update the list
            await loadBarangays();
        } else {
            alert(data.message || 'Failed to add purok');
        }
    } catch (error) {
        console.error('Error adding purok:', error);
        alert('An error occurred while adding the purok');
    }
});

// Load barangays when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadBarangays();
});