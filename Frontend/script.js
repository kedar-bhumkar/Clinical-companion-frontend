document.addEventListener('DOMContentLoaded', () => {
    const aiHubLink = document.getElementById('aiHubLink');
    const chatPopup = document.getElementById('chatPopup');
    const chatHistory = document.getElementById('chatHistory');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const systemButtons = document.querySelectorAll('.systemButton');
    const pageName = document.getElementById('pageName').value;
    const minimizeButton = document.getElementById('minimizeButton');
    const clearButton = document.getElementById('clearButton');
    const maximizeButton = document.getElementById('maximizeButton');
    const loadingIndicator = document.getElementById('loadingIndicator');

    let chatMessages = [];

    
    const dropdownOptions = [
        { text: 'Job aid', icon: 'fas fa-briefcase' },
        { text: 'Web', icon: 'fas fa-search' },
        { text: 'Med lookup', icon: 'fas fa-pills' },
        { text: 'DX code search', icon: 'fas fa-search' }
    ];
    let dropdown = null;

    // Function to create and show dropdown
    function showDropdown(inputRect, cursorPosition) {
        if (dropdown) {
            document.body.removeChild(dropdown);
        }

        dropdown = document.createElement('div');
        dropdown.className = 'dropdown';
        dropdown.style.position = 'absolute';
        dropdown.style.left = `${inputRect.left + cursorPosition}px`;
        dropdown.style.top = `${inputRect.bottom + 5}px`; // Added 5px gap

        dropdownOptions.forEach((option, index) => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerHTML = `<i class="${option.icon}"></i><span>${option.text}</span>`;
            item.addEventListener('click', () => selectOption(option.text));
            dropdown.appendChild(item);
        });

        document.body.appendChild(dropdown);
    }

    // Function to handle option selection
    function selectOption(option) {
        const cursorPosition = messageInput.selectionStart;
        const currentValue = messageInput.value;
        const newValue = currentValue.slice(0, cursorPosition - 1) + 
                         `@${option}:` + 
                         currentValue.slice(cursorPosition);
        messageInput.value = newValue;
        messageInput.setSelectionRange(cursorPosition + option.length + 3, cursorPosition + option.length + 3);
        hideDropdown();
        messageInput.focus();
    }

    // Function to hide dropdown
    function hideDropdown() {
        if (dropdown) {
            document.body.removeChild(dropdown);
            dropdown = null;
        }
    }

    // Event listener for input changes
    messageInput.addEventListener('input', (e) => {
        const cursorPosition = e.target.selectionStart;
        const inputValue = e.target.value;
        
        if (inputValue[cursorPosition - 1] === '@') {
            const inputRect = messageInput.getBoundingClientRect();
            showDropdown(inputRect, cursorPosition * 8); // Assuming 8px per character
        } else {
            hideDropdown();
        }

        styleInput();

        // Existing code for enabling/disabling send button
        sendButton.disabled = messageInput.value.trim() === '';
    });

    // Event listener for keydown to handle keyboard navigation
    messageInput.addEventListener('keydown', (e) => {
        if (!dropdown) return;

        const items = dropdown.querySelectorAll('.dropdown-item');
        let activeIndex = Array.from(items).findIndex(item => item.classList.contains('active'));

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                break;
            case 'ArrowUp':
                e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex !== -1) {
                    selectOption(dropdownOptions[activeIndex].text);
                }
                return;
            case 'Escape':
                hideDropdown();
                return;
            default:
                return;
        }

        items.forEach((item, index) => {
            item.classList.toggle('active', index === activeIndex);
        });
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== messageInput && e.target !== dropdown) {
            hideDropdown();
        }
    });

  
// Function to fetch button configuration
async function fetchButtonConfig() {
    console.log("Fetching button config");
    const pageName = document.getElementById('pageName').value;
    console.log("Page name: " + pageName);
    const data = {
        entity: pageName,        
    };

    try {
        const response = await fetch('http://127.0.0.1:8000/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to fetch button configuration');
        }

        const result = await response.json();
        console.log("Button config: " + JSON.stringify(result));
        return result.llm_response.options || {};
    } catch (error) {
        console.error('Error fetching button configuration:', error);
        return {};
    }
}

// Function to create buttons dynamically
function createButtons(config) {
    const chatButtons = document.getElementById('chatButtons');
    chatButtons.innerHTML = ''; // Clear existing buttons

    for (const [intent, label] of Object.entries(config)) {
        console.log("Intent: " + intent + " Label: " + label);
        const button = document.createElement('button');
        button.className = 'systemButton';
        button.setAttribute('data-intent', intent);
        button.textContent = label;
        chatButtons.appendChild(button);
    }
}

// Function to initialize chat
async function initializeChat() {
    console.log("Initializing chat");
    const buttonConfig = await fetchButtonConfig();
    if(buttonConfig.error){
        console.error("Error fetching button config: " + buttonConfig.error);        
    } else {
        createButtons(buttonConfig);  
        // Add event listeners to the dynamically created buttons
        document.querySelectorAll('.systemButton').forEach(button => {
            button.addEventListener('click', () => {
                messageInput.value = button.getAttribute('data-intent');
                sendMessage('system-intent');
            });
        });
    }

    // ... rest of your chat initialization code ...
}

// Call initializeChat when the page loads
initializeChat();

// Load chat history from localStorage
function loadChatHistory() {
    const storedHistory = localStorage.getItem('chatHistory');
    if (storedHistory) {
        chatMessages = JSON.parse(storedHistory);
        displayChatHistory();
    }
}

// Display chat history in the chat window
function displayChatHistory() {
    chatHistory.innerHTML = ''; // Clear existing messages
    chatMessages.forEach(msg => {
        if (msg.sender === 'server' && msg.message.includes('<')) {
            handleHtmlResponse(msg.message);
        } else {
            addMessageToChat(msg.sender, msg.message, false);
        }
    });
}

// Save chat history to localStorage
function saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatMessages));
}

aiHubLink.addEventListener('click', (e) => {
    e.preventDefault();
    chatPopup.classList.toggle('hidden');
    if (!chatPopup.classList.contains('hidden')) {
        loadChatHistory();
    }
});

maximizeButton.addEventListener('click', () => {
    chatPopup.classList.toggle('maximized');
    const icon = maximizeButton.querySelector('i');
    if (chatPopup.classList.contains('maximized')) {
        icon.classList.remove('fa-expand');
        icon.classList.add('fa-compress');
    } else {
        icon.classList.remove('fa-compress');
        icon.classList.add('fa-expand');
    }
});

minimizeButton.addEventListener('click', () => {
    chatPopup.classList.add('hidden');
    chatPopup.classList.remove('maximized');
    const icon = maximizeButton.querySelector('i');
    icon.classList.remove('fa-compress');
    icon.classList.add('fa-expand');
    saveChatHistory();
});

clearButton.addEventListener('click', () => {
    chatHistory.innerHTML = '';
    chatMessages = [];
    localStorage.removeItem('chatHistory');
});

messageInput.addEventListener('input', () => {
    sendButton.disabled = messageInput.value.trim() === '';
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !sendButton.disabled) {
        e.preventDefault(); // Prevent default form submission
        sendMessage('user-intent');
    }
});

sendButton.addEventListener('click', () => sendMessage('user-intent'));

function addMessageToChat(sender, message, save = true) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    
    const iconElement = document.createElement('div');
    iconElement.classList.add('icon');
    
    const iconClass = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
    iconElement.innerHTML = `<i class="${iconClass}"></i>`;
    
    const textElement = document.createElement('div');
    textElement.textContent = message;
    
    messageElement.appendChild(iconElement);
    messageElement.appendChild(textElement);
    
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    if (save) {
        chatMessages.push({ sender, message });
        saveChatHistory();
    }
}

function handleHtmlResponse(data){
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'server-message');

    const iconElement = document.createElement('div');
    iconElement.classList.add('icon');
    iconElement.innerHTML = '<i class="fas fa-robot"></i>';
    messageElement.appendChild(iconElement);

    const contentContainer = document.createElement('div');
    contentContainer.classList.add('html-content');
    contentContainer.innerHTML = data;

    messageElement.appendChild(contentContainer);
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    chatMessages.push({ sender: 'server', message: data });
    
}

function handleServerResponse(data) {
    console.log("Server response:", data);

    if (data.llm_response.html) {
        handleHtmlResponse(data.llm_response.html);
    } else if (data.llm_response.auto_populate) {
        populateFormFields(JSON.parse(data.llm_response.auto_populate));
        addMessageToChat('server', 'Form has been auto-populated with the available data.');
    } else if (data.llm_response.bot_response) {
        addMessageToChat('server', data.llm_response.bot_response);
    } else {
        addMessageToChat('server', data.llm_response);
    }
}

async function populateFormFields(autoCompleteData) {
    console.log("Auto-completing form fields:", autoCompleteData);
    const form = document.getElementById('theForm');
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const animationDuration = 500;
    const delayBetweenFields = 100;

    for (const item of autoCompleteData) {
        const [key, value] = Object.entries(item)[0];
        const field = form.querySelector(`[data-fieldname="${key}"]`);
        if (field && value !== '' && value !== null && value !== undefined) {
            // Check if the field already has a value
            if (field.type === 'checkbox') {
                if (!field.checked) {
                    field.checked = value === true || value === 'true' || value === '1';
                    await animateField(field);
                }
            } else if (!field.value) {
                field.value = value;
                await animateField(field);
            }
        }
    }
}

async function animateField(field) {
    const animationDuration = 500;
    field.style.transition = `opacity ${animationDuration}ms ease-in-out`;
    field.style.opacity = 0;
    field.offsetHeight; // Trigger reflow
    field.style.opacity = 1;
    highlightField(field);
    await new Promise(resolve => setTimeout(resolve, animationDuration + 100));
}

function highlightField(field) {
    field.classList.add('highlight-field');
    setTimeout(() => {
        field.classList.remove('highlight-field');
    }, 2000); // Remove highlight after 2 seconds
}

function sendMessage(intent) {
    const message = messageInput.value.trim();
    const patient_id = '123456'
    const mockData = false; // Set this to true for mock data, false for real server response

    if (message) {
        addMessageToChat('user', message);
        
        let requestBody = {
            message: message,   
            history: [],
            intent: intent,
            entity: pageName,
            patient_id: patient_id
        };

        // If the intent is auto-populate or just user-intent, add form data to the request body
        if (!message.includes('@Job aid:') && !message.includes('@Web:') && (intent === 'user-intent' || (intent === 'system-intent' && message === 'auto_populate'))) {
            requestBody.form_data = JSON.stringify(getFormData());
        }

        console.log(requestBody);
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');

        if (mockData) {
            // Use mock data
            setTimeout(() => {
                const mockResponse = JSON.stringify(generateMockResponse());
                handleServerResponse(mockResponse);
                saveChatHistory();
                animate();
                loadingIndicator.classList.add('hidden');
            }, 1000); // Simulate network delay
        } else {
            // Use real server response
            fetch('http://127.0.0.1:8000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            })
            .then(response => response.json())
            .then(data => {
                handleServerResponse(data);                        
                saveChatHistory();
                animate();
            })
            .catch(error => {
                console.error('Error:', error);               
                addMessageToChat('server', 'Sorry, an error occurred.');
                animate();
            })
            .finally(() => {
                // Hide loading indicator
                loadingIndicator.classList.add('hidden');
            });
        }

        messageInput.value = '';
        sendButton.disabled = true;
    }
}

function generateMockResponse() {
    return {
        llm_response: {
            response: {
                auto_populate: [
                    {"member_first_name__c": "John"},
                    {"member_last_name__c": "Doe"},
                    {"member_date_of_birth__c": "1985-07-15"},
                    {"member_gender__c": "male"},
                    {"member_email__c": "john.doe@example.com"},
                    {"member_phone_number__c": "+1 (555) 123-4567"},
                    {"order_date__c": "2023-05-10"},
                    {"order_type__c": "Lab"},
                    {"member_weight__c": 180.5},
                    {"member_height__c": 70.1},
                    {"member_allergies__c": "Penicillin, Peanuts"},
                    {"member_diagnosis__c": "Type 2 Diabetes, Hypertension"},
                    {"member_current_medications__c": "Metformin 500mg, Lisinopril 10mg"},
                    {"order_notes__c": "Patient requested early morning appointment for lab work."}
                ]
            }
        }
    };
}

function getFormData() {
    const form = document.getElementById('theForm');
    const formElements = form.elements;
    const formData = [];

    for (let element of formElements) {
        if (element.name) {
            formData.push({
                name: element.name,
                id: element.id,
                'data-description': element.getAttribute('data-description'),
                'data-fieldname': element.getAttribute('data-fieldname')
            });
        }
    }

    return formData;
}

function animate() {        
    // Find the last server message in the chat history
    const serverMessages = chatHistory.querySelectorAll('.server-message');
    const lastServerMessage = serverMessages[serverMessages.length - 1];

    // Animate only the robot icon of the last server message
    if (lastServerMessage) {
        const robotIcon = lastServerMessage.querySelector('.fas.fa-robot');
        if (robotIcon) {
            robotIcon.classList.add('explode-animation');
            robotIcon.addEventListener('animationend', () => {
                robotIcon.classList.remove('explode-animation');
            }, { once: true });
        }
    }
}

// Add CSS for highlight effect
const style = document.createElement('style');
style.textContent = `
    @keyframes highlightPulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
    }

    .highlight-field {
        border: 2px solid red !important;
        animation: highlightPulse 1s ease-out;
    }
`;
document.head.appendChild(style);

loadChatHistory();

// Add this function to parse and style the input
function styleInput() {
    const input = messageInput.value;
    const styledInput = input.replace(/@(Job aid|Web|Med lookup|DX code search):/g, '<span class="option-text">@$1:</span>');
    messageInput.innerHTML = styledInput;
}
});

// Remove this line as it's now redundant
// document.addEventListener('DOMContentLoaded', initializeChat);
