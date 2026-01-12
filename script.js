const STORAGE_KEY = "promptLibrary";
const NOTES_STORAGE_KEY = "promptNotesData";
const CATEGORIES_STORAGE_KEY = "promptCategories";
const TOOLTIP_PREFERENCES_KEY = "promptTypeTooltipPreferences";

// Default categories
const DEFAULT_CATEGORIES = ["General", "Toolbox", "Web-React"];

const form = document.getElementById("prompt-form");
const titleInput = document.getElementById("prompt-title");
const contentInput = document.getElementById("prompt-content");
const modelInput = document.getElementById("prompt-model");
const groupInput = document.getElementById("prompt-group");
const promptTypeInput = document.getElementById("prompt-type");
const contentGroup = document.getElementById("content-group");
const promptTypeTooltip = document.getElementById("prompt-type-tooltip");
const promptTypeInfoIcon = document.getElementById("prompt-type-info-icon");

// Track current tooltip ID for Ok button handler
let currentTooltipId = null;
const promptsList = document.getElementById("prompts-list");
const emptyState = document.getElementById("empty-state");
const formSection = document.getElementById("form-section");
const toggleFormBtn = document.getElementById("toggle-form-btn");
const closeFormBtn = document.getElementById("close-form-btn");
const promptsSection = document.querySelector(".prompts-section");
const categoryFilterBtn = document.getElementById("category-filter-btn");
const categoryMenu = document.getElementById("category-menu");
const categorySelected = document.getElementById("category-selected");
const selectedCategoryText = document.getElementById("selected-category-text");
const clearCategoryBtn = document.getElementById("clear-category-btn");
const typeFilterBtn = document.getElementById("type-filter-btn");
const typeMenu = document.getElementById("type-menu");
const typeSelected = document.getElementById("type-selected");
const selectedTypeText = document.getElementById("selected-type-text");
const clearTypeBtn = document.getElementById("clear-type-btn");
const filtersSelected = document.getElementById("filters-selected");
const noFiltersSelected = document.getElementById("no-filters-selected");
const addCategoryBtn = document.getElementById("add-category-btn");
const addCategoryModal = document.getElementById("add-category-modal");
const addCategoryForm = document.getElementById("add-category-form");
const newCategoryNameInput = document.getElementById("new-category-name");
const closeCategoryModalBtn = document.getElementById(
  "close-category-modal-btn"
);
const cancelCategoryBtn = document.getElementById("cancel-category-btn");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const clearSearchBtn = document.getElementById("clear-search-btn");
const editCategoryModal = document.getElementById("edit-category-modal");
const editCategoryForm = document.getElementById("edit-category-form");
const editCategoryNameInput = document.getElementById("edit-category-name");
const closeEditCategoryModalBtn = document.getElementById(
  "close-edit-category-modal-btn"
);
const cancelEditCategoryBtn = document.getElementById(
  "cancel-edit-category-btn"
);
const deleteCategoryModal = document.getElementById("delete-category-modal");
const deleteCategoryMessage = document.getElementById(
  "delete-category-message"
);
const deleteCategoryOptions = document.getElementById(
  "delete-category-options"
);
const moveCategorySelect = document.getElementById("move-category-select");
const moveToCategorySelect = document.getElementById("move-to-category");
const confirmDeleteCategoryBtn = document.getElementById(
  "confirm-delete-category-btn"
);
const cancelDeleteCategoryBtn = document.getElementById(
  "cancel-delete-category-btn"
);
const closeDeleteCategoryModalBtn = document.getElementById(
  "close-delete-category-modal-btn"
);

// Track category being edited/deleted
let categoryBeingEdited = null;
let categoryBeingDeleted = null;

// Transfer/Copy modal references
const transferCopyModal = document.getElementById("transfer-copy-modal");
const transferCopyModalTitle = document.getElementById(
  "transfer-copy-modal-title"
);
const transferCopyMessage = document.getElementById("transfer-copy-message");
const transferCopyTargetCategories = document.getElementById(
  "transfer-copy-target-categories"
);
const transferCopyActionSelect = document.getElementById(
  "transfer-copy-action-select"
);
const confirmTransferCopyBtn = document.getElementById(
  "confirm-transfer-copy-btn"
);
const cancelTransferCopyBtn = document.getElementById(
  "cancel-transfer-copy-btn"
);
const closeTransferCopyModalBtn = document.getElementById(
  "close-transfer-copy-modal-btn"
);

// Track prompt being transferred/copied
let promptBeingTransferred = null;

// Track selected category and type
let selectedCategory = null;
let selectedType = null;

// Track search state
let currentSearchQuery = "";
let promptToExpand = null; // Track which prompt should be expanded after render

function loadPrompts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const prompts = stored ? JSON.parse(stored) : [];

    // Migrate existing prompts to have "Toolbox" group if they don't have a group
    // and "Standard" type if they don't have a type
    // Also migrate to versioned structure if needed
    let needsMigration = false;
    const migratedPrompts = prompts.map(prompt => {
      const updated = { ...prompt };

      // Migrate group and type
      if (!prompt.group) {
        needsMigration = true;
        updated.group = "Toolbox";
      }
      if (!prompt.type) {
        needsMigration = true;
        updated.type = "Standard";
      }

      // Migrate to versioned structure if not already versioned
      if (!prompt.versions || !Array.isArray(prompt.versions)) {
        needsMigration = true;
        // Get legacy notes if they exist
        const legacyNote = getNote(prompt.id);
        const version = {
          version: 1,
          content: prompt.content || "",
          title: prompt.title || "",
          type: updated.type || "Standard",
          metadata: prompt.metadata
            ? {
                ...prompt.metadata,
                version: prompt.metadata.version || 1,
              }
            : null,
          notes: legacyNote?.content || "",
          createdAt: prompt.metadata?.createdAt || new Date().toISOString(),
          updatedAt: prompt.metadata?.updatedAt || new Date().toISOString(),
        };
        updated.versions = [version];
        updated.defaultVersion = 1;
      }

      // Ensure defaultVersion exists
      if (
        updated.defaultVersion === undefined ||
        updated.defaultVersion === null
      ) {
        needsMigration = true;
        updated.defaultVersion = updated.versions.length;
      }

      return updated;
    });

    // Save migrated prompts if migration was needed
    if (needsMigration && migratedPrompts.length > 0) {
      savePrompts(migratedPrompts);
      return migratedPrompts;
    }

    return prompts;
  } catch (error) {
    console.error("Error loading prompts:", error);
    return [];
  }
}

function savePrompts(prompts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  } catch (error) {
    console.error("Error saving prompts:", error);
  }
}

// ============================================================================
// Version Management Functions
// ============================================================================

/**
 * Gets the latest version of a prompt
 * @param {Object} prompt - The prompt object
 * @returns {Object|null} The latest version object or null if no versions exist
 */
function getLatestVersion(prompt) {
  if (
    !prompt.versions ||
    !Array.isArray(prompt.versions) ||
    prompt.versions.length === 0
  ) {
    return null;
  }
  return prompt.versions.reduce((latest, version) => {
    return version.version > latest.version ? version : latest;
  }, prompt.versions[0]);
}

/**
 * Gets a specific version by version number
 * @param {Object} prompt - The prompt object
 * @param {number} versionNumber - The version number to retrieve
 * @returns {Object|null} The version object or null if not found
 */
function getVersion(prompt, versionNumber) {
  if (!prompt.versions || !Array.isArray(prompt.versions)) {
    return null;
  }
  return prompt.versions.find(v => v.version === versionNumber) || null;
}

/**
 * Gets the default version of a prompt (or latest if default not set)
 * @param {Object} prompt - The prompt object
 * @returns {Object|null} The default version object or null if no versions exist
 */
function getDefaultVersion(prompt) {
  if (
    !prompt.versions ||
    !Array.isArray(prompt.versions) ||
    prompt.versions.length === 0
  ) {
    return null;
  }

  const defaultVersionNum = prompt.defaultVersion;
  if (defaultVersionNum !== undefined && defaultVersionNum !== null) {
    const version = getVersion(prompt, defaultVersionNum);
    if (version) {
      return version;
    }
  }

  // Fallback to latest version if default not found
  return getLatestVersion(prompt);
}

/**
 * Sets the default version for a prompt
 * @param {string} promptId - The prompt ID
 * @param {number} versionNumber - The version number to set as default
 * @returns {boolean} True if successful, false otherwise
 */
function setDefaultVersion(promptId, versionNumber) {
  const prompts = loadPrompts();
  const prompt = prompts.find(p => p.id === promptId);

  if (!prompt) {
    console.error("Prompt not found:", promptId);
    return false;
  }

  // Verify version exists
  const version = getVersion(prompt, versionNumber);
  if (!version) {
    console.error("Version not found:", versionNumber);
    return false;
  }

  prompt.defaultVersion = versionNumber;
  savePrompts(prompts);
  return true;
}

/**
 * Gets the current version data (content, title, type, notes) for a prompt
 * Uses defaultVersion if set, otherwise latest version
 * @param {Object} prompt - The prompt object
 * @returns {Object} Object with content, title, type, metadata, notes
 */
function getCurrentVersionData(prompt) {
  const version = getDefaultVersion(prompt);
  if (version) {
    return {
      content: version.content || "",
      title: version.title || "",
      type: version.type || "Standard",
      metadata: version.metadata || null,
      notes: version.notes || "",
    };
  }

  // Fallback for prompts without versions (shouldn't happen after migration)
  // Try to get notes from the old notes storage for backward compatibility
  const legacyNote = getNote(prompt.id);
  return {
    content: prompt.content || "",
    title: prompt.title || "",
    type: prompt.type || "Standard",
    metadata: prompt.metadata || null,
    notes: legacyNote?.content || "",
  };
}

// Category management functions
function loadCategories() {
  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with default categories
    saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  } catch (error) {
    console.error("Error loading categories:", error);
    return DEFAULT_CATEGORIES;
  }
}

function saveCategories(categories) {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error("Error saving categories:", error);
  }
}

function addCategory(categoryName) {
  const categories = loadCategories();
  const trimmedName = categoryName.trim();

  // Check if category already exists (case-insensitive)
  const exists = categories.some(
    cat => cat.toLowerCase() === trimmedName.toLowerCase()
  );

  if (exists) {
    alert(`Category "${trimmedName}" already exists.`);
    return false;
  }

  if (trimmedName.length === 0) {
    alert("Category name cannot be empty.");
    return false;
  }

  categories.push(trimmedName);
  saveCategories(categories);
  updateCategoryDropdowns();
  return true;
}

function getPromptsByCategory(category) {
  const prompts = loadPrompts();
  return prompts.filter(prompt => prompt.group === category);
}

function openEditCategoryModal(category) {
  categoryBeingEdited = category;
  editCategoryNameInput.value = category;
  editCategoryModal.hidden = false;
  editCategoryNameInput.focus();
  categoryMenu.hidden = true;
}

function openDeleteCategoryModal(category) {
  categoryBeingDeleted = category;
  const promptsInCategory = getPromptsByCategory(category);
  const promptCount = promptsInCategory.length;

  if (promptCount > 0) {
    deleteCategoryMessage.textContent = `Category "${category}" contains ${promptCount} prompt(s). What would you like to do with them?`;
    deleteCategoryOptions.hidden = false;

    // Populate move category dropdown with other categories
    const categories = loadCategories();
    const otherCategories = categories.filter(cat => cat !== category);
    moveToCategorySelect.innerHTML = "";
    otherCategories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      moveToCategorySelect.appendChild(option);
    });

    // Show/hide move category select based on radio selection
    const deleteAction = document.querySelector(
      'input[name="delete-action"]:checked'
    );
    moveCategorySelect.hidden = deleteAction.value !== "move";
  } else {
    deleteCategoryMessage.textContent = `Are you sure you want to delete category "${category}"?`;
    deleteCategoryOptions.hidden = true;
  }

  deleteCategoryModal.hidden = false;
  categoryMenu.hidden = true;
}

function editCategory(oldName, newName) {
  const categories = loadCategories();
  const trimmedName = newName.trim();

  // Check if new name already exists (case-insensitive, excluding current category)
  const exists = categories.some(
    cat => cat.toLowerCase() === trimmedName.toLowerCase() && cat !== oldName
  );

  if (exists) {
    alert(`Category "${trimmedName}" already exists.`);
    return false;
  }

  if (trimmedName.length === 0) {
    alert("Category name cannot be empty.");
    return false;
  }

  // Update category in categories list
  const categoryIndex = categories.indexOf(oldName);
  if (categoryIndex !== -1) {
    categories[categoryIndex] = trimmedName;
    saveCategories(categories);
  }

  // Update all prompts with the old category name to use the new name
  const prompts = loadPrompts();
  let updated = false;
  const updatedPrompts = prompts.map(prompt => {
    if (prompt.group === oldName) {
      updated = true;
      return { ...prompt, group: trimmedName };
    }
    return prompt;
  });

  if (updated) {
    savePrompts(updatedPrompts);
  }

  // If the edited category was selected, update selection
  if (selectedCategory === oldName) {
    selectedCategory = trimmedName;
  }

  updateCategoryDropdowns();
  updateFiltersUI();
  return true;
}

function openTransferCopyModal(promptId) {
  promptBeingTransferred = promptId;
  const prompts = loadPrompts();
  const prompt = prompts.find(p => p.id === promptId);

  if (!prompt) {
    alert("Prompt not found.");
    return;
  }

  const currentCategory = prompt.group || null;
  transferCopyMessage.textContent = `"${
    prompt.title
  }" is currently in category "${currentCategory || "Uncategorized"}".`;

  // Populate target category checkboxes with all categories except current
  const categories = loadCategories();
  const otherCategories = categories.filter(cat => cat !== currentCategory);
  transferCopyTargetCategories.innerHTML = "";

  if (otherCategories.length === 0) {
    const noCategoriesMsg = document.createElement("p");
    noCategoriesMsg.className = "no-categories-message";
    noCategoriesMsg.textContent = "No other categories available.";
    noCategoriesMsg.style.color = "var(--text-secondary)";
    noCategoriesMsg.style.fontSize = "0.9rem";
    transferCopyTargetCategories.appendChild(noCategoriesMsg);
  } else {
    otherCategories.forEach(cat => {
      const checkboxContainer = document.createElement("label");
      checkboxContainer.className = "checkbox-option";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "target-category";
      checkbox.value = cat;

      const labelText = document.createElement("span");
      labelText.textContent = cat;

      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(labelText);
      transferCopyTargetCategories.appendChild(checkboxContainer);
    });
  }

  // Reset dropdown to default
  if (transferCopyActionSelect) {
    transferCopyActionSelect.value = "";
  }

  // Disable confirm button initially
  if (confirmTransferCopyBtn) {
    confirmTransferCopyBtn.disabled = true;
  }

  // Update button state based on current selections
  updateTransferCopyButtonState();

  transferCopyModal.hidden = false;
}

/**
 * Updates the enabled/disabled state of the Confirm button
 * based on whether an action is selected and at least one category is checked
 */
function updateTransferCopyButtonState() {
  if (!confirmTransferCopyBtn) return;

  // Check if an action is selected
  const actionSelected =
    transferCopyActionSelect && transferCopyActionSelect.value !== "";

  // Check if at least one category is checked
  const checkedCategories = Array.from(
    document.querySelectorAll('input[name="target-category"]:checked')
  );
  const categorySelected = checkedCategories.length > 0;

  // Enable button only if both conditions are met
  confirmTransferCopyBtn.disabled = !(actionSelected && categorySelected);
}

function transferPrompt(promptId, targetCategory) {
  const prompts = loadPrompts();
  const promptIndex = prompts.findIndex(p => p.id === promptId);

  if (promptIndex === -1) {
    alert("Prompt not found.");
    return false;
  }

  prompts[promptIndex].group = targetCategory;
  savePrompts(prompts);

  // If the prompt was in the currently selected category, re-render
  renderPrompts();
  return true;
}

function copyPrompt(promptId, targetCategory) {
  const prompts = loadPrompts();
  const originalPrompt = prompts.find(p => p.id === promptId);

  if (!originalPrompt) {
    alert("Prompt not found.");
    return false;
  }

  const newPromptId = createPromptId();

  // Get the default version data
  const defaultVersion = getDefaultVersion(originalPrompt);
  const versionData = defaultVersion || getCurrentVersionData(originalPrompt);

  // Create new versions array with updated metadata for the copy
  const newVersions = originalPrompt.versions
    ? originalPrompt.versions.map(version => ({
        ...version,
        metadata: version.metadata
          ? {
              ...version.metadata,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    : [
        {
          version: 1,
          content: versionData.content,
          title: versionData.title,
          type: versionData.type,
          metadata: versionData.metadata
            ? {
                ...versionData.metadata,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

  // Create a copy with new ID and updated metadata
  const newPrompt = {
    ...originalPrompt,
    id: newPromptId,
    group: targetCategory,
    rating: 0, // Reset rating for the copy
    versions: newVersions,
    defaultVersion: originalPrompt.defaultVersion || 1,
    // Update top-level fields for backward compatibility
    title: versionData.title,
    content: versionData.content,
    type: versionData.type,
    metadata: versionData.metadata
      ? {
          ...versionData.metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : null,
  };

  prompts.push(newPrompt);
  savePrompts(prompts);

  // Copy notes if they exist
  const originalNote = getNote(promptId);
  if (originalNote && originalNote.content) {
    saveNote(newPromptId, originalNote.content);
  }

  // Re-render to show the copy if target category is selected
  renderPrompts();
  return true;
}

function deleteCategory(category, action, moveToCategory = null) {
  const prompts = loadPrompts();
  const promptsInCategory = getPromptsByCategory(category);

  if (action === "delete") {
    // Delete all prompts in this category
    const remainingPrompts = prompts.filter(
      prompt => prompt.group !== category
    );
    savePrompts(remainingPrompts);

    // Also delete associated notes
    promptsInCategory.forEach(prompt => {
      deleteNote(prompt.id);
    });
  } else if (action === "move" && moveToCategory) {
    // Move all prompts to the selected category
    const updatedPrompts = prompts.map(prompt => {
      if (prompt.group === category) {
        return { ...prompt, group: moveToCategory };
      }
      return prompt;
    });
    savePrompts(updatedPrompts);
  }

  // Remove category from categories list
  const categories = loadCategories();
  const filteredCategories = categories.filter(cat => cat !== category);
  saveCategories(filteredCategories);

  // Clear selection if deleted category was selected
  if (selectedCategory === category) {
    selectedCategory = null;
  }

  updateCategoryDropdowns();
  updateFiltersUI();
}

function updateCategoryDropdowns() {
  const categories = loadCategories();

  // Sort categories alphabetically (case-insensitive)
  const sortedCategories = [...categories].sort((a, b) => {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });

  // Update form group dropdown
  if (groupInput) {
    groupInput.innerHTML = '<option value="">Select a group</option>';
    sortedCategories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      groupInput.appendChild(option);
    });
  }

  // Update category filter menu
  if (categoryMenu) {
    categoryMenu.innerHTML = "";
    sortedCategories.forEach(category => {
      const categoryItem = document.createElement("div");
      categoryItem.className = "category-item";

      const button = document.createElement("button");
      button.className = "category-option";
      button.setAttribute("data-category", category);
      button.textContent = category;
      button.addEventListener("click", e => {
        e.stopPropagation();
        selectedCategory = category;
        categoryMenu.hidden = true;
        updateFiltersUI();
      });

      const actionsContainer = document.createElement("div");
      actionsContainer.className = "category-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "category-action-btn edit-category-btn";
      editBtn.setAttribute("data-category", category);
      editBtn.setAttribute("aria-label", `Edit ${category}`);
      editBtn.textContent = "✎";
      editBtn.addEventListener("click", e => {
        e.stopPropagation();
        openEditCategoryModal(category);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "category-action-btn delete-category-btn";
      deleteBtn.setAttribute("data-category", category);
      deleteBtn.setAttribute("aria-label", `Delete ${category}`);
      deleteBtn.textContent = "×";
      deleteBtn.addEventListener("click", e => {
        e.stopPropagation();
        openDeleteCategoryModal(category);
      });

      actionsContainer.appendChild(editBtn);
      actionsContainer.appendChild(deleteBtn);
      categoryItem.appendChild(button);
      categoryItem.appendChild(actionsContainer);
      categoryMenu.appendChild(categoryItem);
    });
  }
}

function createPromptId() {
  return (
    "prompt_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).substr(2, 9)
  );
}

function getPreview(text, maxWords = 8) {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return text.trim();
  }
  return words.slice(0, maxWords).join(" ") + "...";
}

/**
 * Copies prompt content to clipboard and provides user feedback
 * @param {HTMLElement} previewElement - The preview element to show feedback on
 * @param {string} fullContent - The full prompt content to copy
 */
async function copyPromptToClipboard(previewElement, fullContent) {
  try {
    // Copy to clipboard using the Clipboard API
    await navigator.clipboard.writeText(fullContent);

    // Verify the copy was successful by reading back from clipboard
    try {
      const clipboardText = await navigator.clipboard.readText();

      // Verify the entire content was copied
      if (clipboardText === fullContent) {
        // Show success feedback - verified complete copy
        showCopyFeedback(previewElement, true);
      } else {
        // Content mismatch - show error
        showCopyFeedback(previewElement, false, "Copy incomplete");
      }
    } catch (readError) {
      // If we can't read from clipboard (permissions issue),
      // assume success since write succeeded
      console.log(
        "Could not verify clipboard content (permissions), but copy likely succeeded"
      );
      showCopyFeedback(previewElement, true);
    }
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    // Fallback for older browsers or if clipboard API fails
    try {
      // Fallback: create temporary textarea element
      const textarea = document.createElement("textarea");
      textarea.value = fullContent;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.left = "-999999px";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, fullContent.length);

      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (successful) {
        showCopyFeedback(previewElement, true);
      } else {
        showCopyFeedback(previewElement, false, "Copy failed");
      }
    } catch (fallbackError) {
      console.error("Fallback copy failed:", fallbackError);
      showCopyFeedback(previewElement, false, "Copy unavailable");
    }
  }
}

/**
 * Shows visual feedback when prompt is copied
 * @param {HTMLElement} previewElement - The preview element to show feedback on
 * @param {boolean} success - Whether the copy was successful
 * @param {string} message - Optional custom message
 */
function showCopyFeedback(previewElement, success, message = null) {
  const originalText = previewElement.textContent;
  const feedbackMessage = message || (success ? "✓ Copied!" : "✗ Copy failed");

  // Add visual feedback class
  previewElement.classList.add("copy-feedback");
  if (success) {
    previewElement.classList.add("copy-success");
  } else {
    previewElement.classList.add("copy-error");
  }

  // Temporarily change text to show feedback
  previewElement.textContent = feedbackMessage;

  // Restore original text after 2 seconds
  setTimeout(() => {
    previewElement.textContent = originalText;
    previewElement.classList.remove(
      "copy-feedback",
      "copy-success",
      "copy-error"
    );
  }, 2000);
}

// ============================================================================
// Metadata Tracking Functions
// ============================================================================

/**
 * Validates if a string is a valid ISO 8601 date string
 * @param {string} dateString - The date string to validate
 * @returns {boolean} True if valid ISO 8601 format
 */
function isValidISO8601(dateString) {
  try {
    const date = new Date(dateString);
    return (
      date.toISOString() === dateString ||
      date.toISOString().slice(0, -1) + "Z" === dateString
    );
  } catch (error) {
    return false;
  }
}

/**
 * Validates model name according to rules
 * @param {string} modelName - The model name to validate
 * @throws {Error} If model name is invalid
 */
function validateModelName(modelName) {
  if (typeof modelName !== "string") {
    throw new Error("Model name must be a string");
  }
  if (modelName.trim().length === 0) {
    throw new Error("Model name cannot be empty");
  }
  if (modelName.length > 100) {
    throw new Error("Model name cannot exceed 100 characters");
  }
}

/**
 * Estimates tokens from text content
 * @param {string} text - The text content to estimate tokens for
 * @param {boolean} isCode - Whether the text is code (default: false)
 * @returns {TokenEstimate} Object with min, max, and confidence
 */
function estimateTokens(text, isCode = false) {
  try {
    if (typeof text !== "string") {
      throw new Error("Text must be a string");
    }
    if (typeof isCode !== "boolean") {
      throw new Error("isCode must be a boolean");
    }

    const wordCount = text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
    const characterCount = text.length;

    let min = Math.floor(0.75 * wordCount);
    let max = Math.floor(0.25 * characterCount);

    if (isCode) {
      min = Math.floor(min * 1.3);
      max = Math.floor(max * 1.3);
    }

    const estimatedTokens = Math.max(min, max);
    let confidence;
    if (estimatedTokens < 1000) {
      confidence = "high";
    } else if (estimatedTokens <= 5000) {
      confidence = "medium";
    } else {
      confidence = "low";
    }

    return {
      min,
      max,
      confidence,
    };
  } catch (error) {
    throw new Error(`Token estimation failed: ${error.message}`);
  }
}

/**
 * Tracks model metadata for a prompt
 * @param {string} modelName - The name of the model
 * @param {string} content - The prompt content
 * @param {number} version - The version number for this prompt
 * @returns {MetadataObject} Metadata object with model, timestamps, token estimate, and version
 */
function trackModel(modelName, content, version = 1) {
  try {
    validateModelName(modelName);

    if (typeof content !== "string") {
      throw new Error("Content must be a string");
    }

    const now = new Date();
    const createdAt = now.toISOString();

    // Detect if content is code (simple heuristic: check for common code patterns)
    const isCode =
      /(function|const|let|var|class|import|export|def |return |\{|\}|\(\)|=>|;)/.test(
        content
      );
    const tokenEstimate = estimateTokens(content, isCode);

    return {
      model: modelName.trim(),
      createdAt,
      updatedAt: createdAt,
      tokenEstimate,
      version: version,
    };
  } catch (error) {
    throw new Error(`Failed to track model: ${error.message}`);
  }
}

/**
 * Updates timestamps in metadata object
 * @param {MetadataObject} metadata - The metadata object to update
 * @param {number} version - Optional version number to update
 * @returns {MetadataObject} Updated metadata object
 */
function updateTimestamps(metadata, version = null) {
  try {
    if (!metadata || typeof metadata !== "object") {
      throw new Error("Metadata must be an object");
    }

    if (!metadata.createdAt || !isValidISO8601(metadata.createdAt)) {
      throw new Error(
        "Invalid createdAt timestamp: must be valid ISO 8601 format"
      );
    }

    const now = new Date();
    const updatedAt = now.toISOString();
    const createdAtDate = new Date(metadata.createdAt);

    if (now < createdAtDate) {
      throw new Error("updatedAt cannot be earlier than createdAt");
    }

    const updated = {
      ...metadata,
      updatedAt,
    };

    if (version !== null) {
      updated.version = version;
    }

    return updated;
  } catch (error) {
    throw new Error(`Failed to update timestamps: ${error.message}`);
  }
}

function createStarRating(promptId, currentRating) {
  const starsContainer = document.createElement("div");
  starsContainer.className = "star-rating";
  starsContainer.setAttribute("data-prompt-id", promptId);
  starsContainer.setAttribute("aria-label", "Rate this prompt");

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("button");
    star.className = "star";
    star.type = "button";
    star.setAttribute("data-rating", i);
    star.setAttribute("aria-label", `${i} star${i > 1 ? "s" : ""}`);
    star.textContent = i <= currentRating ? "★" : "☆";
    star.classList.toggle("filled", i <= currentRating);

    // Only allow clicks when editing - will be enabled/disabled in enterEditMode/exitEditMode
    star.addEventListener("click", () => setRating(promptId, i));
    star.style.pointerEvents = "none"; // Disabled by default
    star.style.cursor = "default";

    starsContainer.appendChild(star);
  }

  return starsContainer;
}

function setRating(promptId, rating) {
  // Only allow rating changes when editing
  const card = document.querySelector(`[data-prompt-id="${promptId}"]`);
  if (!card || !card.classList.contains("editing")) {
    return; // Don't allow rating changes when not editing
  }

  const prompts = loadPrompts();
  const prompt = prompts.find(p => p.id === promptId);
  if (prompt) {
    prompt.rating = rating;
    savePrompts(prompts);
    updateStarDisplay(promptId, rating);
  }
}

function updateStarDisplay(promptId, rating) {
  const starsContainer = document.querySelector(
    `[data-prompt-id="${promptId}"]`
  );
  if (!starsContainer) return;

  const stars = starsContainer.querySelectorAll(".star");
  stars.forEach((star, index) => {
    const starValue = index + 1;
    star.textContent = starValue <= rating ? "★" : "☆";
    star.classList.toggle("filled", starValue <= rating);
  });
}

// ============================================================================
// Notes CRUD Functions
// ============================================================================

/**
 * Loads all notes from localStorage
 * Returns an object mapping promptId to note data
 * @returns {Object} Object with promptId keys and note objects as values
 */
function loadNotes() {
  try {
    const stored = localStorage.getItem(NOTES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error loading notes:", error);
    return {};
  }
}

/**
 * Saves all notes to localStorage
 * Serializes the notes object to JSON string
 * @param {Object} notes - Object mapping promptId to note data
 */
function saveNotes(notes) {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error("Error saving notes:", error);
  }
}

/**
 * Gets a specific note for a promptId
 * @param {string} promptId - The ID of the prompt
 * @returns {Object|null} Note object or null if not found
 */
function getNote(promptId) {
  const notes = loadNotes();
  return notes[promptId] || null;
}

/**
 * Creates or updates a note for a specific promptId
 * @param {string} promptId - The ID of the prompt
 * @param {string} content - The note content
 */
function saveNote(promptId, content) {
  const notes = loadNotes();
  notes[promptId] = {
    content: content.trim(),
    lastSaved: Date.now(),
  };
  saveNotes(notes);
}

/**
 * Deletes a note for a specific promptId
 * @param {string} promptId - The ID of the prompt
 */
function deleteNote(promptId) {
  const notes = loadNotes();
  delete notes[promptId];
  saveNotes(notes);
}

/**
 * Creates the notes section HTML for a prompt card
 * @param {string} promptId - The ID of the prompt
 * @param {string} notesContent - Optional notes content (from version snapshot)
 * @returns {HTMLElement} The notes section element
 */
function createNotesSection(promptId, notesContent = null) {
  const notesSection = document.createElement("section");
  notesSection.className = "notes-section";
  notesSection.setAttribute("data-prompt-id", promptId);

  const header = document.createElement("div");
  header.className = "notes-header";

  const title = document.createElement("h4");
  title.className = "notes-title";
  title.textContent = "Notes";

  const statusIndicator = document.createElement("span");
  statusIndicator.className = "notes-status";
  statusIndicator.setAttribute("aria-live", "polite");

  header.appendChild(title);
  header.appendChild(statusIndicator);

  const textarea = document.createElement("textarea");
  textarea.className = "notes-textarea";
  textarea.setAttribute("data-prompt-id", promptId);
  textarea.setAttribute(
    "placeholder",
    "No notes yet. Edit the prompt to add notes."
  );
  textarea.setAttribute("rows", "4");
  textarea.readOnly = true; // Notes are only editable when editing the prompt

  // Load note content from version snapshot if provided, otherwise from legacy storage
  if (notesContent !== null) {
    textarea.value = notesContent;
  } else {
    // Fallback to legacy notes storage for backward compatibility
    const note = getNote(promptId);
    if (note && note.content) {
      textarea.value = note.content;
    }
  }

  // Create empty buttons container (needed for compatibility with exitEditMode)
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "notes-buttons";
  buttonsContainer.style.display = "none"; // Always hidden since we removed the buttons

  notesSection.appendChild(header);
  notesSection.appendChild(textarea);
  notesSection.appendChild(buttonsContainer);

  return notesSection;
}

/**
 * Formats ISO 8601 date string to human-readable format
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Human-readable date string
 */
function formatDate(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "Invalid date";
  }
}

/**
 * Creates the metadata display component for a prompt card
 * @param {MetadataObject} metadata - The metadata object to display
 * @returns {HTMLElement} The metadata section element
 */
function createMetadataSection(metadata) {
  const metadataSection = document.createElement("section");
  metadataSection.className = "metadata-section";

  if (!metadata) {
    return metadataSection;
  }

  try {
    // Version number
    if (metadata.version !== undefined && metadata.version !== null) {
      const versionRow = document.createElement("div");
      versionRow.className = "metadata-row";
      const versionLabel = document.createElement("span");
      versionLabel.className = "metadata-label";
      versionLabel.textContent = "Version:";
      const versionValue = document.createElement("span");
      versionValue.className = "metadata-value";
      versionValue.textContent = `v${metadata.version}`;
      versionRow.appendChild(versionLabel);
      versionRow.appendChild(versionValue);
      metadataSection.appendChild(versionRow);
    }

    // Model name
    const modelRow = document.createElement("div");
    modelRow.className = "metadata-row";
    const modelLabel = document.createElement("span");
    modelLabel.className = "metadata-label";
    modelLabel.textContent = "Model:";
    const modelValue = document.createElement("span");
    modelValue.className = "metadata-value";
    modelValue.textContent = metadata.model || "N/A";
    modelRow.appendChild(modelLabel);
    modelRow.appendChild(modelValue);

    // Timestamps
    const createdAtRow = document.createElement("div");
    createdAtRow.className = "metadata-row";
    const createdAtLabel = document.createElement("span");
    createdAtLabel.className = "metadata-label";
    createdAtLabel.textContent = "Created:";
    const createdAtValue = document.createElement("span");
    createdAtValue.className = "metadata-value";
    createdAtValue.textContent = metadata.createdAt
      ? formatDate(metadata.createdAt)
      : "N/A";
    createdAtRow.appendChild(createdAtLabel);
    createdAtRow.appendChild(createdAtValue);

    const updatedAtRow = document.createElement("div");
    updatedAtRow.className = "metadata-row";
    const updatedAtLabel = document.createElement("span");
    updatedAtLabel.className = "metadata-label";
    updatedAtLabel.textContent = "Updated:";
    const updatedAtValue = document.createElement("span");
    updatedAtValue.className = "metadata-value";
    updatedAtValue.textContent = metadata.updatedAt
      ? formatDate(metadata.updatedAt)
      : "N/A";
    updatedAtRow.appendChild(updatedAtLabel);
    updatedAtRow.appendChild(updatedAtValue);

    // Token estimate - split into two separate rows
    if (metadata.tokenEstimate) {
      const tokenEstimate = metadata.tokenEstimate;

      // Token Cost row
      const tokenRow = document.createElement("div");
      tokenRow.className = "metadata-row";
      const tokenLabel = document.createElement("span");
      tokenLabel.className = "metadata-label";
      tokenLabel.textContent = "Token Cost:";
      const tokenValue = document.createElement("span");
      tokenValue.className = "metadata-value";
      tokenValue.textContent = `${tokenEstimate.min}-${tokenEstimate.max}`;
      tokenRow.appendChild(tokenLabel);
      tokenRow.appendChild(tokenValue);
      metadataSection.appendChild(tokenRow);

      // Confidence Rating row
      const confidenceRow = document.createElement("div");
      confidenceRow.className = "metadata-row";
      const confidenceLabel = document.createElement("span");
      confidenceLabel.className = "metadata-label";
      confidenceLabel.textContent = "Confidence Rating:";
      const confidenceValue = document.createElement("span");
      confidenceValue.className = "metadata-value";

      // Add confidence badge
      const confidenceBadge = document.createElement("span");
      confidenceBadge.className = `token-confidence token-confidence-${tokenEstimate.confidence}`;
      confidenceBadge.textContent = tokenEstimate.confidence;
      confidenceValue.appendChild(confidenceBadge);

      confidenceRow.appendChild(confidenceLabel);
      confidenceRow.appendChild(confidenceValue);
      metadataSection.appendChild(confidenceRow);
    }

    metadataSection.appendChild(modelRow);
    metadataSection.appendChild(createdAtRow);
    metadataSection.appendChild(updatedAtRow);
  } catch (error) {
    console.error("Error creating metadata section:", error);
  }

  return metadataSection;
}

/**
 * Creates a version selector dropdown for a prompt
 * @param {Object} prompt - The prompt object
 * @returns {HTMLElement} The version selector element
 */
function createVersionSelector(prompt) {
  const container = document.createElement("div");
  container.className = "version-selector-container";

  const label = document.createElement("label");
  label.className = "version-selector-label";
  label.textContent = "Version:";
  label.setAttribute("for", `version-select-${prompt.id}`);

  const select = document.createElement("select");
  select.className = "version-selector";
  select.id = `version-select-${prompt.id}`;
  select.setAttribute("data-prompt-id", prompt.id);

  // Prevent card collapse when clicking on the select
  select.addEventListener("click", e => {
    e.stopPropagation();
  });

  // Also prevent mousedown which can trigger before click
  select.addEventListener("mousedown", e => {
    e.stopPropagation();
  });

  if (
    !prompt.versions ||
    !Array.isArray(prompt.versions) ||
    prompt.versions.length === 0
  ) {
    const option = document.createElement("option");
    option.value = "1";
    option.textContent = "v1";
    select.appendChild(option);
    container.appendChild(label);
    container.appendChild(select);
    return container;
  }

  // Sort versions by version number (descending - latest first)
  const sortedVersions = [...prompt.versions].sort(
    (a, b) => b.version - a.version
  );

  sortedVersions.forEach(version => {
    const option = document.createElement("option");
    option.value = version.version.toString();
    const isDefault = prompt.defaultVersion === version.version;
    const isLatest = version.version === getLatestVersion(prompt)?.version;
    let labelText = `v${version.version}`;
    if (isDefault) labelText += " (default)";
    if (isLatest && !isDefault) labelText += " (latest)";
    option.textContent = labelText;
    if (isDefault) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  // Create "Set as Default" button
  const setDefaultBtn = document.createElement("button");
  setDefaultBtn.className = "set-default-version-btn";
  setDefaultBtn.textContent = "Set as Default";
  setDefaultBtn.type = "button";
  setDefaultBtn.style.display =
    prompt.defaultVersion === parseInt(select.value) ? "none" : "inline-block";

  // Add change handler
  select.addEventListener("change", e => {
    e.stopPropagation(); // Prevent card collapse/expand
    const selectedVersionNum = parseInt(e.target.value);
    const prompts = loadPrompts();
    const currentPrompt = prompts.find(p => p.id === prompt.id);
    if (!currentPrompt) return;

    const selectedVersion = getVersion(currentPrompt, selectedVersionNum);
    if (!selectedVersion) return;

    // Ensure card is expanded so user can see the changes
    const card = document.querySelector(`[data-prompt-id="${prompt.id}"]`);
    if (card && card.classList.contains("collapsed")) {
      card.classList.remove("collapsed");
      const indicator = card.querySelector(".expand-indicator");
      if (indicator) {
        indicator.textContent = "▼";
      }
      const transferCopyBtn = card.querySelector(".transfer-copy-btn");
      if (transferCopyBtn) {
        transferCopyBtn.style.display = "inline-block";
      }
    }

    // Update the displayed content, title, type, and metadata
    updatePromptCardForVersion(prompt.id, selectedVersion);

    // Update the stored original values so edit mode uses the correct version
    if (card) {
      // Store the selected version's data for edit mode
      const textarea = card.querySelector(".edit-textarea");
      const titleInput = card.querySelector(".edit-title-input");
      const typeSelect = card.querySelector(".edit-type-select");

      // Update the stored values by updating the input fields
      // These will be read when entering edit mode
      if (textarea) {
        textarea.setAttribute("data-version-content", selectedVersion.content);
        // Also update the value if not in edit mode (for when user enters edit mode)
        if (!card.classList.contains("editing")) {
          textarea.value = selectedVersion.content;
        }
      }
      if (titleInput) {
        titleInput.setAttribute("data-version-title", selectedVersion.title);
        if (!card.classList.contains("editing")) {
          titleInput.value = selectedVersion.title;
        }
      }
      if (typeSelect) {
        typeSelect.setAttribute(
          "data-version-type",
          selectedVersion.type || "Standard"
        );
        if (!card.classList.contains("editing")) {
          typeSelect.value = selectedVersion.type || "Standard";
        }
      }

      // Update notes textarea with version-specific notes
      const notesTextarea = card.querySelector(".notes-textarea");
      if (notesTextarea) {
        const versionNotes =
          selectedVersion.notes !== undefined ? selectedVersion.notes : "";
        notesTextarea.value = versionNotes;
      }
    }

    // Show/hide "Set as Default" button
    setDefaultBtn.style.display =
      currentPrompt.defaultVersion === selectedVersionNum
        ? "none"
        : "inline-block";
  });

  // Add click handler for "Set as Default" button
  setDefaultBtn.addEventListener("click", e => {
    e.stopPropagation();
    const selectedVersionNum = parseInt(select.value);
    if (setDefaultVersion(prompt.id, selectedVersionNum)) {
      // Update the prompt object reference
      const prompts = loadPrompts();
      const updatedPrompt = prompts.find(p => p.id === prompt.id);
      if (updatedPrompt) {
        // Update the selector options
        updateVersionSelector(select, updatedPrompt);
        // Hide the button
        setDefaultBtn.style.display = "none";
        // Re-render to update the card with new default
        renderPrompts();
      }
    }
  });

  container.appendChild(label);
  container.appendChild(select);
  container.appendChild(setDefaultBtn);
  return container;
}

/**
 * Updates the version selector dropdown options
 * @param {HTMLElement} versionSelector - The select element
 * @param {Object} prompt - The prompt object
 */
function updateVersionSelector(versionSelector, prompt) {
  if (!versionSelector || !prompt) return;

  const currentValue = versionSelector.value;
  versionSelector.innerHTML = "";

  if (
    !prompt.versions ||
    !Array.isArray(prompt.versions) ||
    prompt.versions.length === 0
  ) {
    const option = document.createElement("option");
    option.value = "1";
    option.textContent = "v1";
    versionSelector.appendChild(option);
    return;
  }

  const sortedVersions = [...prompt.versions].sort(
    (a, b) => b.version - a.version
  );

  sortedVersions.forEach(version => {
    const option = document.createElement("option");
    option.value = version.version.toString();
    const isDefault = prompt.defaultVersion === version.version;
    const isLatest = version.version === getLatestVersion(prompt)?.version;
    let labelText = `v${version.version}`;
    if (isDefault) labelText += " (default)";
    if (isLatest && !isDefault) labelText += " (latest)";
    option.textContent = labelText;
    if (isDefault || option.value === currentValue) {
      option.selected = true;
    }
    versionSelector.appendChild(option);
  });

  // Update "Set as Default" button visibility
  const container = versionSelector.closest(".version-selector-container");
  if (container) {
    const setDefaultBtn = container.querySelector(".set-default-version-btn");
    if (setDefaultBtn) {
      const selectedVersionNum = parseInt(versionSelector.value);
      setDefaultBtn.style.display =
        prompt.defaultVersion === selectedVersionNum ? "none" : "inline-block";
    }
  }
}

/**
 * Updates a prompt card to display a specific version
 * @param {string} promptId - The prompt ID
 * @param {Object} version - The version object to display
 */
function updatePromptCardForVersion(promptId, version) {
  const card = document.querySelector(`[data-prompt-id="${promptId}"]`);
  if (!card) return;

  const prompts = loadPrompts();
  const prompt = prompts.find(p => p.id === promptId);
  if (!prompt) return;

  // Always update preview (regardless of edit mode)
  const preview = card.querySelector(".card-preview");
  if (preview) {
    preview.textContent = getPreview(version.content);
    // Update the data attribute so copy functionality uses the correct version
    preview.setAttribute("data-version-content", version.content);
  }

  // Update title (only if not in edit mode)
  if (!card.classList.contains("editing")) {
    const title = card.querySelector(".card-title");
    if (title) {
      title.textContent = version.title;
    }

    // Update type badge
    const typeBadge = card.querySelector(".prompt-type-badge");
    if (typeBadge) {
      typeBadge.className = "prompt-type-badge";
      const typeClass = `prompt-type-${(version.type || "Standard")
        .toLowerCase()
        .replace(/\s+/g, "-")}`;
      typeBadge.classList.add(typeClass);
      typeBadge.textContent = version.type || "Standard";
    }
  }

  // Update metadata section (always update, regardless of edit mode)
  const metadataSection = card.querySelector(".metadata-section");
  if (metadataSection && version.metadata) {
    const newMetadataSection = createMetadataSection(version.metadata);
    metadataSection.replaceWith(newMetadataSection);
  }

  // Update notes section to show version-specific notes
  const notesSection = card.querySelector(".notes-section");
  if (notesSection) {
    const notesTextarea = notesSection.querySelector(".notes-textarea");
    if (notesTextarea) {
      // Update notes content from version snapshot
      const versionNotes = version.notes !== undefined ? version.notes : "";
      notesTextarea.value = versionNotes;
    }
  }

  // Update textarea if in edit mode
  const textarea = card.querySelector(".edit-textarea");
  if (textarea && card.classList.contains("editing")) {
    textarea.value = version.content;
  }

  const titleInput = card.querySelector(".edit-title-input");
  if (titleInput && card.classList.contains("editing")) {
    titleInput.value = version.title;
  }

  const typeSelect = card.querySelector(".edit-type-select");
  if (typeSelect && card.classList.contains("editing")) {
    typeSelect.value = version.type || "Standard";
  }
}

/**
 * Enters edit mode for a prompt card
 * @param {HTMLElement} card - The prompt card element
 * @param {HTMLElement} preview - The preview element to hide
 * @param {HTMLElement} editControls - The edit controls container to show
 * @param {HTMLElement} textarea - The textarea element for editing
 * @param {string} promptId - The prompt ID
 * @param {string} originalContent - The original content for cancel
 * @param {string} originalType - The original type for cancel
 * @param {string} originalTitle - The original title for cancel
 * @param {HTMLElement} typeSelect - The type select element
 * @param {HTMLElement} titleInput - The title input element
 * @param {HTMLElement} notesTextarea - The notes textarea element
 * @param {HTMLElement} notesButtonsContainer - The notes buttons container
 * @param {string} originalNoteContent - The original note content for cancel
 */
function enterEditMode(
  card,
  preview,
  editControls,
  textarea,
  promptId,
  originalContent,
  originalType,
  originalTitle,
  typeSelect,
  titleInput,
  notesTextarea,
  notesButtonsContainer,
  originalNoteContent
) {
  // Ensure card is expanded when editing
  card.classList.remove("collapsed");
  const indicator = card.querySelector(".expand-indicator");
  if (indicator) {
    indicator.textContent = "▼";
  }

  card.classList.add("editing");
  preview.style.display = "none";
  editControls.style.display = "block";

  // Check if a specific version is selected via the version selector
  // If so, use that version's data instead of the original/default version
  const versionSelector = card.querySelector(".version-selector");
  let contentToEdit = originalContent;
  let typeToEdit = originalType;
  let titleToEdit = originalTitle;

  if (versionSelector && versionSelector.value) {
    const prompts = loadPrompts();
    const currentPrompt = prompts.find(p => p.id === promptId);
    if (currentPrompt) {
      const selectedVersionNum = parseInt(versionSelector.value);
      const selectedVersion = getVersion(currentPrompt, selectedVersionNum);
      if (selectedVersion) {
        // Use the selected version's data for editing
        contentToEdit = selectedVersion.content;
        typeToEdit = selectedVersion.type || "Standard";
        titleToEdit = selectedVersion.title;
      }
    }
  }

  // Also check data attributes as fallback (set when version changes)
  if (textarea && textarea.getAttribute("data-version-content")) {
    contentToEdit = textarea.getAttribute("data-version-content");
  }
  if (titleInput && titleInput.getAttribute("data-version-title")) {
    titleToEdit = titleInput.getAttribute("data-version-title");
  }
  if (typeSelect && typeSelect.getAttribute("data-version-type")) {
    typeToEdit = typeSelect.getAttribute("data-version-type");
  }

  textarea.value = contentToEdit;
  if (typeSelect) {
    typeSelect.value = typeToEdit;
  }
  if (titleInput) {
    titleInput.value = titleToEdit;
  }

  // Update notes textarea with version-specific notes
  if (notesTextarea) {
    let notesToEdit = originalNoteContent;

    // Check version selector for selected version's notes
    if (versionSelector && versionSelector.value) {
      const prompts = loadPrompts();
      const currentPrompt = prompts.find(p => p.id === promptId);
      if (currentPrompt) {
        const selectedVersionNum = parseInt(versionSelector.value);
        const selectedVersion = getVersion(currentPrompt, selectedVersionNum);
        if (selectedVersion && selectedVersion.notes !== undefined) {
          notesToEdit = selectedVersion.notes;
        }
      }
    }

    notesTextarea.value = notesToEdit;
  }

  // Show save/cancel/delete buttons at bottom
  const editButtonsContainer = card.querySelector(".edit-buttons");
  if (editButtonsContainer) {
    editButtonsContainer.style.display = "flex";
  }

  // Show edit-mode Delete button and hide card-actions/Transfer-Copy button when editing
  const editDeleteBtn = card.querySelector(".edit-delete-btn");
  if (editDeleteBtn) {
    editDeleteBtn.style.display = "inline-block";
  }
  const cardActions = card.querySelector(".card-actions");
  if (cardActions) {
    cardActions.style.display = "none";
  }
  const transferCopyBtn = card.querySelector(".transfer-copy-btn");
  if (transferCopyBtn) {
    transferCopyBtn.style.display = "none";
  }

  // Make notes editable and hide notes buttons when in prompt edit mode
  if (notesTextarea) {
    notesTextarea.readOnly = false;
    notesTextarea.classList.add("editing");
    if (notesTextarea.value !== originalNoteContent) {
      notesTextarea.value = originalNoteContent;
    }
  }
  if (notesButtonsContainer) {
    notesButtonsContainer.style.display = "none";
  }

  // Enable star rating clicks when editing
  const starsContainer = card.querySelector(".star-rating");
  if (starsContainer) {
    const stars = starsContainer.querySelectorAll(".star");
    stars.forEach(star => {
      star.style.pointerEvents = "auto";
      star.style.cursor = "pointer";
    });
  }

  // Focus on title input first, then textarea
  if (titleInput) {
    titleInput.focus();
    titleInput.setSelectionRange(
      titleInput.value.length,
      titleInput.value.length
    );
  } else {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }
}

/**
 * Exits edit mode for a prompt card
 * @param {HTMLElement} card - The prompt card element
 * @param {HTMLElement} preview - The preview element to show
 * @param {HTMLElement} editControls - The edit controls container to hide
 * @param {HTMLElement} textarea - The textarea element
 * @param {string} content - The content to display in preview
 * @param {HTMLElement} notesTextarea - The notes textarea element
 * @param {HTMLElement} notesButtonsContainer - The notes buttons container
 * @param {string} noteContent - The note content to restore
 */
function exitEditMode(
  card,
  preview,
  editControls,
  textarea,
  content,
  notesTextarea,
  notesButtonsContainer,
  noteContent
) {
  card.classList.remove("editing");
  preview.style.display = "block";
  editControls.style.display = "none";
  preview.textContent = getPreview(content);

  // Hide save/cancel/delete buttons
  const editButtonsContainer = card.querySelector(".edit-buttons");
  if (editButtonsContainer) {
    editButtonsContainer.style.display = "none";
  }

  // Hide edit-mode Delete button and show card-actions/Transfer-Copy button when exiting edit mode
  const editDeleteBtn = card.querySelector(".edit-delete-btn");
  if (editDeleteBtn) {
    editDeleteBtn.style.display = "none";
  }
  const cardActions = card.querySelector(".card-actions");
  if (cardActions) {
    cardActions.style.display = "flex";
  }
  const transferCopyBtn = card.querySelector(".transfer-copy-btn");
  if (transferCopyBtn) {
    // Only show Transfer/Copy button if card is not collapsed
    if (!card.classList.contains("collapsed")) {
      transferCopyBtn.style.display = "inline-block";
    } else {
      transferCopyBtn.style.display = "none";
    }
  }

  // Restore notes editing state - make read-only when exiting edit mode
  if (notesTextarea) {
    notesTextarea.readOnly = true;
    notesTextarea.classList.remove("editing");
    // Update note content if provided
    if (noteContent !== undefined) {
      notesTextarea.value = noteContent;
    }
  }
  if (notesButtonsContainer) {
    notesButtonsContainer.style.display = "none"; // Always hidden since buttons were removed
  }

  // Disable star rating clicks when not editing
  const starsContainer = card.querySelector(".star-rating");
  if (starsContainer) {
    const stars = starsContainer.querySelectorAll(".star");
    stars.forEach(star => {
      star.style.pointerEvents = "none";
      star.style.cursor = "default";
    });
  }
}

/**
 * Updates the type badge on a prompt card
 * @param {HTMLElement} card - The prompt card element
 * @param {string} newType - The new type value
 */
function updateTypeBadge(card, newType) {
  const typeBadge = card.querySelector(".prompt-type-badge");
  if (typeBadge) {
    // Remove old type class
    typeBadge.className = "prompt-type-badge";
    // Add new type class
    const typeClass = `prompt-type-${(newType || "Standard")
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
    typeBadge.classList.add(typeClass);
    typeBadge.textContent = newType || "Standard";
  }
}

/**
 * Saves the edited prompt content, type, title, and notes
 * Creates a new version instead of overwriting
 * @param {string} promptId - The prompt ID to update
 * @param {string} newContent - The new content
 * @param {string} newType - The new type
 * @param {string} newTitle - The new title
 * @param {string} newNotes - The new notes content (optional)
 */
function savePromptEdit(
  promptId,
  newContent,
  newType,
  newTitle,
  newNotes = ""
) {
  const prompts = loadPrompts();
  const prompt = prompts.find(p => p.id === promptId);

  if (!prompt) {
    console.error("Prompt not found:", promptId);
    return;
  }

  // Ensure versions array exists
  if (!prompt.versions || !Array.isArray(prompt.versions)) {
    // Shouldn't happen after migration, but handle gracefully
    const currentData = getCurrentVersionData(prompt);
    // Get legacy notes if they exist
    const legacyNote = getNote(promptId);
    prompt.versions = [
      {
        version: 1,
        content: currentData.content,
        title: currentData.title,
        type: currentData.type,
        metadata: currentData.metadata,
        notes: legacyNote?.content || currentData.notes || "",
        createdAt: prompt.metadata?.createdAt || new Date().toISOString(),
        updatedAt: prompt.metadata?.updatedAt || new Date().toISOString(),
      },
    ];
    prompt.defaultVersion = 1;
  }

  // Get the latest version number
  const latestVersion = getLatestVersion(prompt);
  const nextVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

  // Get the current default version's metadata to preserve model info
  const currentDefaultVersion = getDefaultVersion(prompt);
  const currentMetadata = currentDefaultVersion?.metadata || prompt.metadata;

  // Create new metadata with updated version, timestamps, and token estimate
  const now = new Date();
  const isCode =
    /(function|const|let|var|class|import|export|def |return |\{|\}|\(\)|=>|;)/.test(
      newContent
    );
  const tokenEstimate = estimateTokens(newContent, isCode);

  let newMetadata = null;
  if (currentMetadata) {
    newMetadata = {
      ...currentMetadata,
      version: nextVersionNumber,
      updatedAt: now.toISOString(),
      tokenEstimate: tokenEstimate,
    };
    // Preserve createdAt from original version
    if (currentDefaultVersion) {
      newMetadata.createdAt =
        currentDefaultVersion.metadata?.createdAt || currentMetadata.createdAt;
    }
  } else {
    // Create new metadata if none exists
    newMetadata = {
      version: nextVersionNumber,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      tokenEstimate: tokenEstimate,
    };
  }

  // Get current notes to include in version snapshot
  const currentNote = getNote(promptId);
  const notesContent =
    newNotes !== undefined ? newNotes : currentNote?.content || "";

  // Create new version object (includes notes as part of the snapshot)
  const newVersion = {
    version: nextVersionNumber,
    content: newContent,
    title: newTitle,
    type: newType || "Standard",
    metadata: newMetadata,
    notes: notesContent.trim(), // Include notes in version snapshot
    createdAt: currentDefaultVersion?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // Add new version to versions array (do not overwrite previous versions)
  prompt.versions.push(newVersion);

  // Set the new version as the default (as per requirement: edits always become default)
  prompt.defaultVersion = nextVersionNumber;

  // Update top-level fields for backward compatibility (use latest version)
  prompt.content = newContent;
  prompt.title = newTitle;
  prompt.type = newType || "Standard";
  prompt.metadata = newMetadata;

  savePrompts(prompts);

  // Reload prompts to get the updated prompt with new version
  const updatedPrompts = loadPrompts();
  const updatedPrompt = updatedPrompts.find(p => p.id === promptId);

  if (!updatedPrompt) {
    console.error("Updated prompt not found:", promptId);
    return;
  }

  // Update metadata display in the card
  const card = document.querySelector(`[data-prompt-id="${promptId}"]`);
  if (card) {
    // Get the new default version to display
    const newDefaultVersion = getDefaultVersion(updatedPrompt);

    if (newDefaultVersion) {
      // Update the displayed content, title, type, and metadata to show the new version
      updatePromptCardForVersion(promptId, newDefaultVersion);
    }

    // Update version selector if it exists
    const versionSelector = card.querySelector(".version-selector");
    if (versionSelector) {
      updateVersionSelector(versionSelector, updatedPrompt);
    }

    // Update metadata section with new version's metadata
    const metadataSection = card.querySelector(".metadata-section");
    if (metadataSection && newDefaultVersion && newDefaultVersion.metadata) {
      const newMetadataSection = createMetadataSection(
        newDefaultVersion.metadata
      );
      metadataSection.replaceWith(newMetadataSection);
    }
  }

  // If type changed and we're filtering by type, re-render to update visibility
  if (selectedType && newType !== selectedType) {
    renderPrompts();
  }
}

function renderPrompts() {
  const prompts = loadPrompts();

  // If neither category nor type is selected, don't render prompts
  if (!selectedCategory && !selectedType) {
    promptsList.hidden = true;
    emptyState.hidden = true;
    noFiltersSelected.hidden = false;
    return;
  }

  // Expand the prompt if one was requested
  const expandPromptId = promptToExpand;
  promptToExpand = null;

  // Filter prompts by selected category and/or type
  let filteredPrompts = prompts;

  if (selectedCategory) {
    filteredPrompts = filteredPrompts.filter(
      prompt => prompt.group === selectedCategory
    );
  }

  if (selectedType) {
    filteredPrompts = filteredPrompts.filter(prompt => {
      const versionData = getCurrentVersionData(prompt);
      return versionData.type === selectedType;
    });
  }

  if (filteredPrompts.length === 0) {
    promptsList.hidden = true;
    emptyState.hidden = false;
    noFiltersSelected.hidden = true;
    return;
  }

  promptsList.hidden = false;
  emptyState.hidden = true;
  noFiltersSelected.hidden = true;
  promptsList.innerHTML = "";

  // Sort prompts by rating first (highest to lowest), then alphabetically by title
  const sortedPrompts = [...filteredPrompts].sort((a, b) => {
    // Get ratings (default to 0 if not set)
    const aRating = a.rating || 0;
    const bRating = b.rating || 0;

    // First, sort by rating (descending - highest first)
    if (bRating !== aRating) {
      return bRating - aRating;
    }

    // If ratings are equal, sort alphabetically by title (A-Z)
    const aVersionData = getCurrentVersionData(a);
    const bVersionData = getCurrentVersionData(b);
    const aTitle = (aVersionData.title || "").toLowerCase();
    const bTitle = (bVersionData.title || "").toLowerCase();
    if (aTitle < bTitle) return -1;
    if (aTitle > bTitle) return 1;
    return 0;
  });

  sortedPrompts.forEach(prompt => {
    // Get current version data (default version)
    const versionData = getCurrentVersionData(prompt);

    const card = document.createElement("div");
    card.className = "prompt-card collapsed";
    card.setAttribute("data-prompt-id", prompt.id);

    // Create title container with edit button and expand indicator
    const titleContainer = document.createElement("div");
    titleContainer.className = "card-title-container";

    // Create type badge
    const typeBadge = document.createElement("span");
    typeBadge.className = "prompt-type-badge";
    const typeClass = `prompt-type-${(versionData.type || "Standard")
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
    typeBadge.className = `prompt-type-badge ${typeClass}`;
    typeBadge.textContent = versionData.type || "Standard";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = versionData.title;

    const transferCopyBtn = document.createElement("button");
    transferCopyBtn.className = "transfer-copy-btn";
    transferCopyBtn.textContent = "Transfer/Copy";
    transferCopyBtn.type = "button";
    transferCopyBtn.addEventListener("click", e => {
      e.stopPropagation(); // Prevent card collapse/expand
      openTransferCopyModal(prompt.id);
    });

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "Edit";
    editBtn.type = "button";
    editBtn.setAttribute("aria-label", "Edit prompt content");

    // Add expand/collapse indicator
    const expandIndicator = document.createElement("span");
    expandIndicator.className = "expand-indicator";
    expandIndicator.setAttribute("aria-hidden", "true");
    expandIndicator.textContent = "▶";

    titleContainer.appendChild(expandIndicator);
    titleContainer.appendChild(title);
    titleContainer.appendChild(transferCopyBtn);
    titleContainer.appendChild(editBtn);

    const preview = document.createElement("p");
    preview.className = "card-preview";
    preview.textContent = getPreview(versionData.content);
    preview.setAttribute("title", "Click to copy full prompt");
    preview.setAttribute("role", "button");
    preview.setAttribute("tabindex", "0");
    preview.setAttribute(
      "aria-label",
      "Click to copy prompt content to clipboard"
    );

    // Store original content, type, title, rating, and notes for cancel functionality
    let originalContent = versionData.content;
    let originalType = versionData.type || "Standard";
    let originalTitle = versionData.title;
    let originalRating = prompt.rating || 0;
    const note = getNote(prompt.id);
    let originalNoteContent = note && note.content ? note.content : "";

    // Store prompt ID in preview for copy functionality
    preview.setAttribute("data-prompt-id", prompt.id);

    // Add click handler to copy full prompt content (only when not in edit mode)
    preview.addEventListener("click", async e => {
      e.stopPropagation(); // Prevent card collapse/expand
      if (!card.classList.contains("editing")) {
        // Get the currently selected version from the version selector
        const prompts = loadPrompts();
        const currentPrompt = prompts.find(p => p.id === prompt.id);
        if (currentPrompt) {
          const versionSelector = card.querySelector(".version-selector");
          let versionToCopy = getDefaultVersion(currentPrompt);
          if (versionSelector && versionSelector.value) {
            const selectedVersionNum = parseInt(versionSelector.value);
            const selectedVersion = getVersion(
              currentPrompt,
              selectedVersionNum
            );
            if (selectedVersion) {
              versionToCopy = selectedVersion;
            }
          }
          const contentToCopy = versionToCopy
            ? versionToCopy.content
            : versionData.content;
          await copyPromptToClipboard(preview, contentToCopy);
        } else {
          await copyPromptToClipboard(preview, versionData.content);
        }
      }
    });

    // Also support keyboard interaction (Enter/Space)
    preview.addEventListener("keydown", async e => {
      if (
        !card.classList.contains("editing") &&
        (e.key === "Enter" || e.key === " ")
      ) {
        e.preventDefault();
        // Get the currently selected version from the version selector
        const prompts = loadPrompts();
        const currentPrompt = prompts.find(p => p.id === prompt.id);
        if (currentPrompt) {
          const versionSelector = card.querySelector(".version-selector");
          let versionToCopy = getDefaultVersion(currentPrompt);
          if (versionSelector && versionSelector.value) {
            const selectedVersionNum = parseInt(versionSelector.value);
            const selectedVersion = getVersion(
              currentPrompt,
              selectedVersionNum
            );
            if (selectedVersion) {
              versionToCopy = selectedVersion;
            }
          }
          const contentToCopy = versionToCopy
            ? versionToCopy.content
            : versionData.content;
          await copyPromptToClipboard(preview, contentToCopy);
        } else {
          await copyPromptToClipboard(preview, versionData.content);
        }
      }
    });

    // Create version selector
    const versionSelector = createVersionSelector(prompt);

    // Add metadata section (use current version's metadata)
    const metadataSection = createMetadataSection(versionData.metadata);

    const rating = createStarRating(prompt.id, prompt.rating || 0);

    // Create rating container to hold rating and type badge
    const ratingContainer = document.createElement("div");
    ratingContainer.className = "rating-type-container";
    ratingContainer.appendChild(rating);
    ratingContainer.appendChild(typeBadge);

    const actions = document.createElement("div");
    actions.className = "card-actions";
    // Transfer/Copy button moved to title container - actions container kept for structure

    // Add notes section (use version-specific notes)
    const notesSection = createNotesSection(prompt.id, versionData.notes);
    const notesTextarea = notesSection.querySelector(".notes-textarea");
    const notesButtonsContainer = notesSection.querySelector(".notes-buttons");

    // Create edit mode controls (initially hidden)
    const editControls = document.createElement("div");
    editControls.className = "edit-controls";
    editControls.style.display = "none";

    // Create title input for editing
    const titleInputContainer = document.createElement("div");
    titleInputContainer.className = "edit-title-group";

    const titleInputLabel = document.createElement("label");
    titleInputLabel.className = "edit-title-label";
    titleInputLabel.textContent = "Title:";
    titleInputLabel.setAttribute("for", `edit-title-${prompt.id}`);

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "edit-title-input";
    titleInput.id = `edit-title-${prompt.id}`;
    titleInput.value = versionData.title;
    titleInput.required = true;

    titleInputContainer.appendChild(titleInputLabel);
    titleInputContainer.appendChild(titleInput);

    // Create type selector for editing
    const typeSelectContainer = document.createElement("div");
    typeSelectContainer.className = "edit-type-group";

    const typeSelectLabel = document.createElement("label");
    typeSelectLabel.className = "edit-type-label";
    typeSelectLabel.textContent = "Prompt Type:";
    typeSelectLabel.setAttribute("for", `edit-type-${prompt.id}`);

    const typeSelect = document.createElement("select");
    typeSelect.className = "edit-type-select";
    typeSelect.id = `edit-type-${prompt.id}`;

    const typeOptions = ["Standard", "Zero Shot", "One Shot", "Few Shot"];
    typeOptions.forEach(type => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      if (type === (versionData.type || "Standard")) {
        option.selected = true;
      }
      typeSelect.appendChild(option);
    });

    typeSelectContainer.appendChild(typeSelectLabel);
    typeSelectContainer.appendChild(typeSelect);

    const textarea = document.createElement("textarea");
    textarea.className = "edit-textarea";
    textarea.value = versionData.content;
    textarea.setAttribute("rows", "8");

    const saveBtn = document.createElement("button");
    saveBtn.className = "save-btn";
    saveBtn.textContent = "Save";
    saveBtn.type = "button";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cancel-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.type = "button";

    // Create Delete button for edit mode (only visible when editing)
    const editDeleteBtn = document.createElement("button");
    editDeleteBtn.className = "delete-btn edit-delete-btn";
    editDeleteBtn.textContent = "Delete";
    editDeleteBtn.type = "button";
    editDeleteBtn.style.display = "none"; // Hidden by default, shown when editing
    editDeleteBtn.addEventListener("click", e => {
      e.stopPropagation(); // Prevent card collapse/expand
      if (confirm("Are you sure you want to delete this prompt?")) {
        deletePrompt(prompt.id);
      }
    });

    const editButtonsContainer = document.createElement("div");
    editButtonsContainer.className = "edit-buttons";
    editButtonsContainer.appendChild(editDeleteBtn); // Delete on left
    editButtonsContainer.appendChild(cancelBtn); // Cancel in middle
    editButtonsContainer.appendChild(saveBtn); // Save on right

    editControls.appendChild(titleInputContainer);
    editControls.appendChild(typeSelectContainer);
    editControls.appendChild(textarea);
    // editButtonsContainer will be appended after notes section

    // Edit button click handler
    editBtn.addEventListener("click", e => {
      e.stopPropagation(); // Prevent card collapse/expand
      enterEditMode(
        card,
        preview,
        editControls,
        textarea,
        prompt.id,
        originalContent,
        originalType,
        originalTitle,
        typeSelect,
        titleInput,
        notesTextarea,
        notesButtonsContainer,
        originalNoteContent
      );
    });

    // Save button click handler - saves content, type, title, and notes
    saveBtn.addEventListener("click", e => {
      e.stopPropagation(); // Prevent card collapse/expand
      const newContent = textarea.value.trim();
      const newType = typeSelect.value;
      const newTitle = titleInput.value.trim();
      const newNoteContent = notesTextarea ? notesTextarea.value.trim() : "";

      if (newContent && newTitle) {
        // Check if title or rating changed
        const titleChanged = newTitle !== originalTitle;
        // Get current rating from localStorage
        const prompts = loadPrompts();
        const currentPrompt = prompts.find(p => p.id === prompt.id);
        const currentRating = currentPrompt
          ? currentPrompt.rating || 0
          : originalRating;
        const ratingChanged = currentRating !== originalRating;

        // Save prompt content, type, title, and notes (notes are included in version snapshot)
        savePromptEdit(
          prompt.id,
          newContent,
          newType,
          newTitle,
          newNoteContent
        );
        originalContent = newContent;
        originalType = newType;
        originalTitle = newTitle;
        originalRating = currentRating;
        originalNoteContent = newNoteContent;

        // Update title display in card
        if (titleChanged) {
          title.textContent = newTitle;
        }

        // Update type badge
        updateTypeBadge(card, newType);
        exitEditMode(
          card,
          preview,
          editControls,
          textarea,
          newContent,
          notesTextarea,
          notesButtonsContainer,
          originalNoteContent
        );

        // After saving, always re-render the prompt card to show the new version
        // This ensures the card displays the latest version correctly
        // Store the prompt ID to expand it after re-render
        promptToExpand = prompt.id;
        renderPrompts();
      } else {
        if (!newContent) {
          alert("Prompt content cannot be empty");
        } else if (!newTitle) {
          alert("Prompt title cannot be empty");
        }
      }
    });

    // Cancel button click handler - restores content, type, title, rating, and notes
    cancelBtn.addEventListener("click", e => {
      e.stopPropagation(); // Prevent card collapse/expand
      typeSelect.value = originalType;
      titleInput.value = originalTitle;
      if (notesTextarea) {
        notesTextarea.value = originalNoteContent;
      }
      // Restore original rating if it was changed
      const prompts = loadPrompts();
      const currentPrompt = prompts.find(p => p.id === prompt.id);
      if (currentPrompt && currentPrompt.rating !== originalRating) {
        currentPrompt.rating = originalRating;
        savePrompts(prompts);
        updateStarDisplay(prompt.id, originalRating);
      }
      exitEditMode(
        card,
        preview,
        editControls,
        textarea,
        originalContent,
        notesTextarea,
        notesButtonsContainer,
        originalNoteContent
      );
    });

    // Create expandable content wrapper
    const expandableContent = document.createElement("div");
    expandableContent.className = "card-expandable-content";
    expandableContent.appendChild(preview);
    expandableContent.appendChild(editControls);
    expandableContent.appendChild(versionSelector); // Add version selector
    expandableContent.appendChild(metadataSection);
    expandableContent.appendChild(notesSection);
    // Add save/cancel buttons at the bottom after notes section
    expandableContent.appendChild(editButtonsContainer);
    expandableContent.appendChild(actions);

    // Add click handler to toggle expansion (but not on buttons/interactive elements)
    card.addEventListener("click", e => {
      // Don't toggle if clicking on buttons, links, or other interactive elements
      const isButton =
        e.target.tagName === "BUTTON" || e.target.closest("button");
      const isLink = e.target.tagName === "A" || e.target.closest("a");
      const isStarRating = e.target.closest(".star-rating");
      const isNotesSection = e.target.closest(".notes-section");
      const isVersionSelector =
        e.target.closest(".version-selector-container") ||
        e.target.tagName === "SELECT" ||
        e.target.closest("select");
      const isEditing = card.classList.contains("editing");
      const isPreview =
        e.target === preview || e.target.closest(".card-preview");

      if (
        isButton ||
        isLink ||
        isStarRating ||
        isNotesSection ||
        isVersionSelector ||
        isEditing ||
        isPreview
      ) {
        return;
      }

      // Toggle collapsed state
      card.classList.toggle("collapsed");
      const indicator = card.querySelector(".expand-indicator");
      if (indicator) {
        indicator.textContent = card.classList.contains("collapsed")
          ? "▶"
          : "▼";
      }
      // Show/hide Transfer/Copy button based on collapsed state
      const transferCopyBtn = card.querySelector(".transfer-copy-btn");
      if (transferCopyBtn && !card.classList.contains("editing")) {
        transferCopyBtn.style.display = card.classList.contains("collapsed")
          ? "none"
          : "inline-block";
      }
    });

    card.appendChild(titleContainer);
    card.appendChild(ratingContainer);
    card.appendChild(expandableContent);
    promptsList.appendChild(card);

    // Expand the card if this is the prompt we want to expand
    if (expandPromptId === prompt.id) {
      card.classList.remove("collapsed");
      const indicator = card.querySelector(".expand-indicator");
      if (indicator) {
        indicator.textContent = "▼";
      }
      // Show Transfer/Copy button when expanding
      const transferCopyBtn = card.querySelector(".transfer-copy-btn");
      if (transferCopyBtn) {
        transferCopyBtn.style.display = "inline-block";
      }
      // Scroll the card into view
      setTimeout(() => {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  });
}

function deletePrompt(id) {
  const prompts = loadPrompts().filter(p => p.id !== id);
  savePrompts(prompts);
  // Also delete associated note when prompt is deleted
  deleteNote(id);
  renderPrompts();
}

function handleSubmit(e) {
  e.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const modelName = modelInput.value.trim();
  const group = groupInput.value.trim();
  const type = promptTypeInput ? promptTypeInput.value.trim() : "Standard";

  if (!title || !content || !modelName || !group || !type) {
    if (!group) {
      alert("Please select a group for this prompt.");
      groupInput.focus();
      return;
    }
    if (!type) {
      alert("Please select a prompt type.");
      if (promptTypeInput) promptTypeInput.focus();
      return;
    }
    return;
  }

  try {
    // Track metadata for the prompt (version 1 for new prompts)
    let metadata = null;
    if (modelName) {
      try {
        metadata = trackModel(modelName, content, 1);
      } catch (error) {
        alert(`Error tracking metadata: ${error.message}`);
        return;
      }
    }

    const prompts = loadPrompts();

    // Create initial version
    const initialVersion = {
      version: 1,
      content: content,
      title: title,
      type: type,
      metadata: metadata,
      createdAt: metadata?.createdAt || new Date().toISOString(),
      updatedAt: metadata?.updatedAt || new Date().toISOString(),
    };

    const newPrompt = {
      id: createPromptId(),
      title: title, // For backward compatibility
      content: content, // For backward compatibility
      type: type, // For backward compatibility
      rating: 0, // Default rating: 0 means unrated
      metadata: metadata, // For backward compatibility
      group: group, // Required group field
      versions: [initialVersion],
      defaultVersion: 1,
    };

    prompts.push(newPrompt);
    savePrompts(prompts);
    renderPrompts();

    form.reset();
    // Hide content group after reset
    if (contentGroup) {
      contentGroup.hidden = true;
    }
    // Hide tooltip
    if (promptTypeTooltip) {
      promptTypeTooltip.hidden = true;
    }

    // Ask if user wants to create another prompt
    const createAnother = confirm(
      "Prompt saved successfully! Would you like to create another prompt?"
    );

    if (createAnother) {
      // Keep form visible and focus on title input
      titleInput.focus();
    } else {
      // Hide the form section
      formSection.hidden = true;
      updateLayout();
    }
  } catch (error) {
    console.error("Error saving prompt:", error);
    alert(`Error saving prompt: ${error.message}`);
  }
}

// ============================================================================
// Export/Import System
// ============================================================================

const EXPORT_VERSION = "1.0.0";
const BACKUP_STORAGE_KEY = "promptLibrary_backup";
const NOTES_BACKUP_STORAGE_KEY = "promptNotesData_backup";

/**
 * Calculates statistics from prompts array
 * @param {Array} prompts - Array of prompt objects
 * @returns {Object} Statistics object
 */
function calculateStatistics(prompts) {
  if (!Array.isArray(prompts) || prompts.length === 0) {
    return {
      totalPrompts: 0,
      averageRating: 0,
      mostUsedModel: null,
      totalRatings: 0,
    };
  }

  // Calculate average rating
  const ratedPrompts = prompts.filter(p => p.rating && p.rating > 0);
  const totalRatings = ratedPrompts.length;
  const sumRatings = ratedPrompts.reduce((sum, p) => sum + p.rating, 0);
  const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

  // Find most used model
  const modelCounts = {};
  prompts.forEach(prompt => {
    if (prompt.metadata && prompt.metadata.model) {
      const model = prompt.metadata.model;
      modelCounts[model] = (modelCounts[model] || 0) + 1;
    }
  });

  const mostUsedModel =
    Object.keys(modelCounts).length > 0
      ? Object.entries(modelCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
      : null;

  return {
    totalPrompts: prompts.length,
    averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimals
    mostUsedModel,
    totalRatings,
  };
}

/**
 * Creates a backup of current data
 * @returns {boolean} True if backup was successful
 */
function createBackup() {
  try {
    const prompts = loadPrompts();
    const notes = loadNotes();

    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(prompts));
    localStorage.setItem(NOTES_BACKUP_STORAGE_KEY, JSON.stringify(notes));

    return true;
  } catch (error) {
    console.error("Error creating backup:", error);
    return false;
  }
}

/**
 * Restores data from backup
 * @returns {boolean} True if restore was successful
 */
function restoreFromBackup() {
  try {
    const promptsBackup = localStorage.getItem(BACKUP_STORAGE_KEY);
    const notesBackup = localStorage.getItem(NOTES_BACKUP_STORAGE_KEY);

    if (promptsBackup) {
      const prompts = JSON.parse(promptsBackup);
      savePrompts(prompts);
    }

    if (notesBackup) {
      const notes = JSON.parse(notesBackup);
      saveNotes(notes);
    }

    return true;
  } catch (error) {
    console.error("Error restoring from backup:", error);
    return false;
  }
}

/**
 * Validates export data structure
 * @param {Object} data - The data to validate
 * @returns {Object} {valid: boolean, error: string|null}
 */
function validateExportData(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Export data must be an object" };
  }

  if (!data.version || typeof data.version !== "string") {
    return { valid: false, error: "Missing or invalid version field" };
  }

  if (!data.exportTimestamp || typeof data.exportTimestamp !== "string") {
    return {
      valid: false,
      error: "Missing or invalid exportTimestamp field",
    };
  }

  if (!data.prompts || !Array.isArray(data.prompts)) {
    return { valid: false, error: "Missing or invalid prompts array" };
  }

  // Validate each prompt structure
  for (let i = 0; i < data.prompts.length; i++) {
    const prompt = data.prompts[i];
    if (!prompt.id || typeof prompt.id !== "string") {
      return {
        valid: false,
        error: `Prompt at index ${i} is missing or has invalid id`,
      };
    }
    if (!prompt.title || typeof prompt.title !== "string") {
      return {
        valid: false,
        error: `Prompt at index ${i} is missing or has invalid title`,
      };
    }
    if (!prompt.content || typeof prompt.content !== "string") {
      return {
        valid: false,
        error: `Prompt at index ${i} is missing or has invalid content`,
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Checks for duplicate IDs between existing and imported prompts
 * @param {Array} existingPrompts - Current prompts
 * @param {Array} importedPrompts - Prompts to import
 * @returns {Array} Array of duplicate IDs
 */
function findDuplicateIds(existingPrompts, importedPrompts) {
  const existingIds = new Set(existingPrompts.map(p => p.id));
  return importedPrompts.map(p => p.id).filter(id => existingIds.has(id));
}

/**
 * Exports all prompts and notes to a JSON file
 */
function exportData() {
  try {
    const prompts = loadPrompts();
    const notes = loadNotes();
    const statistics = calculateStatistics(prompts);

    // Create export object
    const exportData = {
      version: EXPORT_VERSION,
      exportTimestamp: new Date().toISOString(),
      statistics: statistics,
      prompts: prompts,
      notes: notes, // Include notes in export
    };

    // Validate data integrity
    const validation = validateExportData(exportData);
    if (!validation.valid) {
      throw new Error(`Data validation failed: ${validation.error}`);
    }

    // Create blob and download
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `prompt-library-export-${timestamp}.json`;

    // Trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);

    // Show success message
    showNotification("Export successful!", "success");
  } catch (error) {
    console.error("Export error:", error);
    showNotification(`Export failed: ${error.message}`, "error");
  }
}

/**
 * Imports prompts and notes from a JSON file
 * @param {File} file - The file to import
 * @param {string} mergeStrategy - 'merge' or 'replace'
 */
async function importData(file, mergeStrategy = "merge") {
  let backupCreated = false;

  try {
    // Step 1: Create backup before import
    backupCreated = createBackup();
    if (!backupCreated) {
      throw new Error("Failed to create backup before import");
    }

    // Step 2: Read file
    const fileContent = await readFileAsText(file);

    // Step 3: Parse JSON
    let importData;
    try {
      importData = JSON.parse(fileContent);
    } catch (parseError) {
      throw new Error(`Invalid JSON file: ${parseError.message}`);
    }

    // Step 4: Validate structure and version
    const validation = validateExportData(importData);
    if (!validation.valid) {
      throw new Error(`Invalid export format: ${validation.error}`);
    }

    // Check version compatibility (for future use)
    if (importData.version !== EXPORT_VERSION) {
      const proceed = confirm(
        `This export file uses version ${importData.version}, but the app expects ${EXPORT_VERSION}. ` +
          `The import may not work correctly. Do you want to continue?`
      );
      if (!proceed) {
        return;
      }
    }

    // Step 5: Load existing data
    const existingPrompts = loadPrompts();
    const existingNotes = loadNotes();

    // Step 6: Check for duplicates
    const duplicateIds = findDuplicateIds(existingPrompts, importData.prompts);

    let finalPrompts, finalNotes;

    if (mergeStrategy === "replace") {
      // Replace strategy: use imported data as-is
      finalPrompts = importData.prompts;
      finalNotes = importData.notes || {};
    } else {
      // Merge strategy: combine existing and imported data
      if (duplicateIds.length > 0) {
        const conflictResolution = await resolveMergeConflicts(
          duplicateIds,
          existingPrompts,
          importData.prompts
        );

        if (conflictResolution === "cancel") {
          return; // User cancelled
        }

        // Merge prompts based on conflict resolution
        const existingIds = new Set(existingPrompts.map(p => p.id));
        const importedPromptsToAdd = importData.prompts.filter(
          p => !existingIds.has(p.id)
        );

        // Add prompts that were kept from import (replacing existing)
        const keptFromImport = conflictResolution === "keep-import";
        if (keptFromImport) {
          // Replace existing duplicates with imported versions
          const nonDuplicateExisting = existingPrompts.filter(
            p => !duplicateIds.includes(p.id)
          );
          finalPrompts = [...nonDuplicateExisting, ...importData.prompts];
        } else {
          // Keep existing duplicates
          finalPrompts = [...existingPrompts, ...importedPromptsToAdd];
        }
      } else {
        // No duplicates, simple merge
        finalPrompts = [...existingPrompts, ...importData.prompts];
      }

      // Merge notes
      finalNotes = { ...existingNotes, ...(importData.notes || {}) };
    }

    // Step 7: Save imported data
    savePrompts(finalPrompts);
    saveNotes(finalNotes);

    // Step 8: Refresh UI
    renderPrompts();

    // Step 9: Show success message with statistics
    const importedCount = importData.prompts.length;
    const duplicateCount = duplicateIds.length;
    let message = `Import successful! Imported ${importedCount} prompt(s).`;
    if (duplicateCount > 0 && mergeStrategy === "merge") {
      message += ` ${duplicateCount} duplicate(s) were handled.`;
    }

    showNotification(message, "success");
  } catch (error) {
    console.error("Import error:", error);

    // Rollback on failure
    if (backupCreated) {
      const rollbackSuccess = restoreFromBackup();
      if (rollbackSuccess) {
        renderPrompts();
        showNotification(
          `Import failed and data was restored from backup: ${error.message}`,
          "error"
        );
      } else {
        showNotification(
          `Import failed and backup restore also failed: ${error.message}. ` +
            `Please manually restore from backup if needed.`,
          "error"
        );
      }
    } else {
      showNotification(`Import failed: ${error.message}`, "error");
    }
  }
}

/**
 * Reads a file as text
 * @param {File} file - The file to read
 * @returns {Promise<string>} File content as string
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Resolves merge conflicts for duplicate IDs
 * @param {Array} duplicateIds - Array of duplicate IDs
 * @param {Array} existingPrompts - Current prompts
 * @param {Array} importedPrompts - Prompts being imported
 * @returns {Promise<string>} Resolution strategy: 'keep-existing', 'keep-import', or 'cancel'
 */
async function resolveMergeConflicts(
  duplicateIds,
  existingPrompts,
  importedPrompts
) {
  return new Promise(resolve => {
    // Create a modal dialog for conflict resolution
    const modal = document.createElement("div");
    modal.className = "import-conflict-modal";
    modal.innerHTML = `
      <div class="import-conflict-content">
        <h3>Merge Conflicts Detected</h3>
        <p>Found ${duplicateIds.length} prompt(s) with duplicate IDs:</p>
        <ul class="conflict-list">
          ${duplicateIds
            .map(id => {
              const existing = existingPrompts.find(p => p.id === id);
              const imported = importedPrompts.find(p => p.id === id);
              return `
                <li class="conflict-item">
                  <strong>${existing.title}</strong>
                  <div class="conflict-details">
                    <div>Existing: Created ${formatDate(
                      existing.metadata?.createdAt || new Date().toISOString()
                    )}</div>
                    <div>Imported: Created ${formatDate(
                      imported.metadata?.createdAt || new Date().toISOString()
                    )}</div>
                  </div>
                </li>
              `;
            })
            .join("")}
        </ul>
        <p>How would you like to handle these conflicts?</p>
        <div class="conflict-buttons">
          <button class="conflict-btn keep-existing-btn">Keep Existing (Skip Imported)</button>
          <button class="conflict-btn keep-import-btn">Keep Imported (Replace Existing)</button>
          <button class="conflict-btn cancel-btn">Cancel Import</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle button clicks
    const handleResolve = strategy => {
      document.body.removeChild(modal);
      resolve(strategy);
    };

    modal.querySelector(".keep-existing-btn").addEventListener("click", () => {
      handleResolve("keep-existing");
    });

    modal.querySelector(".keep-import-btn").addEventListener("click", () => {
      handleResolve("keep-import");
    });

    modal.querySelector(".cancel-btn").addEventListener("click", () => {
      handleResolve("cancel");
    });

    // Close modal when clicking outside
    modal.addEventListener("click", e => {
      if (e.target === modal) {
        handleResolve("cancel");
      }
    });

    // Prevent closing when clicking inside the content
    modal
      .querySelector(".import-conflict-content")
      .addEventListener("click", e => {
        e.stopPropagation();
      });
  });
}

/**
 * Shows a notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - 'success' or 'error'
 */
function showNotification(message, type = "success") {
  // Remove existing notification if any
  const existing = document.querySelector(".notification");
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

/**
 * Handles file input change for import
 */
function handleImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  // Check file type
  if (!file.name.endsWith(".json")) {
    showNotification("Please select a JSON file", "error");
    return;
  }

  // Ask user for merge strategy
  const mergeStrategy = confirm(
    "Merge with existing data?\n\n" +
      "Click OK to merge (keep both existing and imported prompts)\n" +
      "Click Cancel to replace (replace all existing prompts with imported ones)"
  )
    ? "merge"
    : "replace";

  importData(file, mergeStrategy).finally(() => {
    // Reset file input
    event.target.value = "";
  });
}

form.addEventListener("submit", handleSubmit);

// Function to update layout based on form visibility
function updateLayout() {
  if (formSection.hidden) {
    // When form is hidden, prompts should be on the right
    promptsSection.style.gridColumn = "2";
  } else {
    // When form is visible, use normal grid layout
    promptsSection.style.gridColumn = "";
  }
}

// Toggle form section visibility
if (toggleFormBtn) {
  toggleFormBtn.addEventListener("click", () => {
    if (formSection.hidden) {
      formSection.hidden = false;
      // Reset form state
      if (contentGroup) {
        contentGroup.hidden = true;
      }
      if (promptTypeTooltip) {
        promptTypeTooltip.hidden = true;
        promptTypeTooltip.classList.remove("show");
      }
      titleInput.focus();
    } else {
      formSection.hidden = true;
    }
    updateLayout();
  });
}

// Close form button
if (closeFormBtn) {
  closeFormBtn.addEventListener("click", () => {
    formSection.hidden = true;
    // Reset form state
    if (contentGroup) {
      contentGroup.hidden = true;
    }
    if (promptTypeTooltip) {
      promptTypeTooltip.hidden = true;
      promptTypeTooltip.classList.remove("show");
    }
    updateLayout();
  });
}

// Function to update filters UI
function updateFiltersUI() {
  // Update category badge
  if (selectedCategory && categorySelected) {
    categorySelected.hidden = false;
    selectedCategoryText.textContent = `Category: ${selectedCategory}`;
    if (categoryFilterBtn) {
      categoryFilterBtn.textContent = "Change Category";
    }
  } else {
    if (categorySelected) categorySelected.hidden = true;
    if (categoryFilterBtn) {
      categoryFilterBtn.textContent = "Select a Category";
    }
  }

  // Update type badge
  if (selectedType && typeSelected) {
    typeSelected.hidden = false;
    selectedTypeText.textContent = `Type: ${selectedType}`;
    if (typeFilterBtn) {
      typeFilterBtn.textContent = "Change Type";
    }
  } else {
    if (typeSelected) typeSelected.hidden = true;
    if (typeFilterBtn) {
      typeFilterBtn.textContent = "Select a Type";
    }
  }

  // Show/hide filters container
  if (filtersSelected) {
    filtersSelected.hidden = !selectedCategory && !selectedType;
  }

  // Hide search results when filters are selected
  if (searchResults && (selectedCategory || selectedType)) {
    searchResults.hidden = true;
  }
  if (
    searchInput &&
    searchInput.value.trim().length > 0 &&
    (selectedCategory || selectedType)
  ) {
    searchInput.value = "";
  }
  if (clearSearchBtn && (selectedCategory || selectedType)) {
    clearSearchBtn.hidden = true;
  }

  renderPrompts();
}

// Category filter button - toggle menu
if (categoryFilterBtn) {
  categoryFilterBtn.addEventListener("click", e => {
    e.stopPropagation();
    categoryMenu.hidden = !categoryMenu.hidden;
    // Close type menu if open
    if (typeMenu) typeMenu.hidden = true;
  });
}

// Type filter button - toggle menu
if (typeFilterBtn) {
  typeFilterBtn.addEventListener("click", e => {
    e.stopPropagation();
    typeMenu.hidden = !typeMenu.hidden;
    // Close category menu if open
    if (categoryMenu) categoryMenu.hidden = true;
  });
}

// Category option buttons are now handled dynamically in updateCategoryDropdowns()
// Update the click handler to use updateFiltersUI
if (categoryMenu) {
  // The handlers are set in updateCategoryDropdowns, but we need to update them
  // Let's update the function that creates category options
}

// Type option buttons
if (typeMenu) {
  const typeOptions = typeMenu.querySelectorAll(".type-option");
  typeOptions.forEach(option => {
    option.addEventListener("click", e => {
      e.stopPropagation();
      selectedType = option.getAttribute("data-type");
      typeMenu.hidden = true;
      updateFiltersUI();
    });
  });
}

// Clear category button
if (clearCategoryBtn) {
  clearCategoryBtn.addEventListener("click", () => {
    selectedCategory = null;
    updateFiltersUI();
  });
}

// Clear type button
if (clearTypeBtn) {
  clearTypeBtn.addEventListener("click", () => {
    selectedType = null;
    updateFiltersUI();
  });
}

// Close menus when clicking outside
document.addEventListener("click", e => {
  if (
    categoryMenu &&
    !categoryMenu.contains(e.target) &&
    !categoryFilterBtn.contains(e.target)
  ) {
    categoryMenu.hidden = true;
  }
  if (
    typeMenu &&
    !typeMenu.contains(e.target) &&
    !typeFilterBtn.contains(e.target)
  ) {
    typeMenu.hidden = true;
  }
});

// Add Category Modal handlers
if (addCategoryBtn) {
  addCategoryBtn.addEventListener("click", () => {
    addCategoryModal.hidden = false;
    newCategoryNameInput.value = "";
    newCategoryNameInput.focus();
  });
}

if (closeCategoryModalBtn) {
  closeCategoryModalBtn.addEventListener("click", () => {
    addCategoryModal.hidden = true;
    addCategoryForm.reset();
  });
}

if (cancelCategoryBtn) {
  cancelCategoryBtn.addEventListener("click", () => {
    addCategoryModal.hidden = true;
    addCategoryForm.reset();
  });
}

if (addCategoryForm) {
  addCategoryForm.addEventListener("submit", e => {
    e.preventDefault();
    const categoryName = newCategoryNameInput.value.trim();

    if (addCategory(categoryName)) {
      addCategoryModal.hidden = true;
      addCategoryForm.reset();
      showNotification(
        `Category "${categoryName}" added successfully!`,
        "success"
      );
    }
  });
}

// Close modal when clicking outside
if (addCategoryModal) {
  addCategoryModal.addEventListener("click", e => {
    if (e.target === addCategoryModal) {
      addCategoryModal.hidden = true;
      addCategoryForm.reset();
    }
  });
}

// Edit Category Modal handlers
if (editCategoryForm) {
  editCategoryForm.addEventListener("submit", e => {
    e.preventDefault();
    const newName = editCategoryNameInput.value.trim();

    if (editCategory(categoryBeingEdited, newName)) {
      editCategoryModal.hidden = true;
      editCategoryForm.reset();
      categoryBeingEdited = null;
      showNotification(
        `Category renamed to "${newName}" successfully!`,
        "success"
      );
    }
  });
}

if (closeEditCategoryModalBtn) {
  closeEditCategoryModalBtn.addEventListener("click", () => {
    editCategoryModal.hidden = true;
    editCategoryForm.reset();
    categoryBeingEdited = null;
  });
}

if (cancelEditCategoryBtn) {
  cancelEditCategoryBtn.addEventListener("click", () => {
    editCategoryModal.hidden = true;
    editCategoryForm.reset();
    categoryBeingEdited = null;
  });
}

if (editCategoryModal) {
  editCategoryModal.addEventListener("click", e => {
    if (e.target === editCategoryModal) {
      editCategoryModal.hidden = true;
      editCategoryForm.reset();
      categoryBeingEdited = null;
    }
  });
}

// Delete Category Modal handlers - handle radio button changes
document.addEventListener("change", e => {
  if (e.target.name === "delete-action") {
    if (e.target.value === "move") {
      moveCategorySelect.hidden = false;
    } else {
      moveCategorySelect.hidden = true;
    }
  }
});

if (confirmDeleteCategoryBtn) {
  confirmDeleteCategoryBtn.addEventListener("click", () => {
    if (!categoryBeingDeleted) return;

    const promptsInCategory = getPromptsByCategory(categoryBeingDeleted);

    if (promptsInCategory.length > 0) {
      const deleteAction = document.querySelector(
        'input[name="delete-action"]:checked'
      );
      const action = deleteAction ? deleteAction.value : "delete";

      if (action === "move") {
        const moveToCategory = moveToCategorySelect.value;
        if (!moveToCategory) {
          alert("Please select a category to move prompts to.");
          return;
        }
        deleteCategory(categoryBeingDeleted, "move", moveToCategory);
        showNotification(
          `Category deleted. ${promptsInCategory.length} prompt(s) moved to "${moveToCategory}".`,
          "success"
        );
      } else {
        deleteCategory(categoryBeingDeleted, "delete");
        showNotification(
          `Category deleted. ${promptsInCategory.length} prompt(s) removed.`,
          "success"
        );
      }
    } else {
      deleteCategory(categoryBeingDeleted, "delete");
      showNotification("Category deleted successfully!", "success");
    }

    deleteCategoryModal.hidden = true;
    categoryBeingDeleted = null;
  });
}

if (cancelDeleteCategoryBtn) {
  cancelDeleteCategoryBtn.addEventListener("click", () => {
    deleteCategoryModal.hidden = true;
    categoryBeingDeleted = null;
  });
}

if (closeDeleteCategoryModalBtn) {
  closeDeleteCategoryModalBtn.addEventListener("click", () => {
    deleteCategoryModal.hidden = true;
    categoryBeingDeleted = null;
  });
}

if (deleteCategoryModal) {
  deleteCategoryModal.addEventListener("click", e => {
    if (e.target === deleteCategoryModal) {
      deleteCategoryModal.hidden = true;
      categoryBeingDeleted = null;
    }
  });
}

// Transfer/Copy Prompt Modal handlers
// Add event listeners for dropdown and checkbox changes to update button state
if (transferCopyActionSelect) {
  transferCopyActionSelect.addEventListener("change", () => {
    updateTransferCopyButtonState();
  });
}

// Add event listener for checkbox changes (using event delegation)
if (transferCopyTargetCategories) {
  transferCopyTargetCategories.addEventListener("change", e => {
    if (e.target.type === "checkbox") {
      updateTransferCopyButtonState();
    }
  });
}

if (confirmTransferCopyBtn) {
  confirmTransferCopyBtn.addEventListener("click", () => {
    if (!promptBeingTransferred) return;

    // Get all checked categories
    const checkedCategories = Array.from(
      document.querySelectorAll('input[name="target-category"]:checked')
    ).map(checkbox => checkbox.value);

    if (checkedCategories.length === 0) {
      alert("Please select at least one target category.");
      return;
    }

    // Get action from dropdown
    const actionType =
      transferCopyActionSelect && transferCopyActionSelect.value
        ? transferCopyActionSelect.value
        : "";

    if (!actionType) {
      alert("Please select an action (Transfer or Copy).");
      return;
    }

    if (actionType === "transfer") {
      // For transfer, use the first selected category (can only move to one place)
      // If multiple selected, warn user but proceed with first one
      if (checkedCategories.length > 1) {
        const proceed = confirm(
          `You selected ${checkedCategories.length} categories. Transfer will move the prompt to "${checkedCategories[0]}". Would you like to continue?`
        );
        if (!proceed) {
          return;
        }
      }
      if (transferPrompt(promptBeingTransferred, checkedCategories[0])) {
        showNotification(
          `Prompt transferred to "${checkedCategories[0]}" successfully!`,
          "success"
        );
      }
    } else {
      // For copy, copy to all selected categories
      let successCount = 0;
      checkedCategories.forEach(category => {
        if (copyPrompt(promptBeingTransferred, category)) {
          successCount++;
        }
      });
      if (successCount > 0) {
        const message =
          successCount === checkedCategories.length
            ? `Prompt copied to ${successCount} categor${
                successCount > 1 ? "ies" : "y"
              } successfully!`
            : `Prompt copied to ${successCount} of ${
                checkedCategories.length
              } categor${checkedCategories.length > 1 ? "ies" : "y"}.`;
        showNotification(message, "success");
      }
    }

    transferCopyModal.hidden = true;
    promptBeingTransferred = null;
  });
}

if (cancelTransferCopyBtn) {
  cancelTransferCopyBtn.addEventListener("click", () => {
    transferCopyModal.hidden = true;
    promptBeingTransferred = null;
  });
}

if (closeTransferCopyModalBtn) {
  closeTransferCopyModalBtn.addEventListener("click", () => {
    transferCopyModal.hidden = true;
    promptBeingTransferred = null;
  });
}

if (transferCopyModal) {
  transferCopyModal.addEventListener("click", e => {
    if (e.target === transferCopyModal) {
      transferCopyModal.hidden = true;
      promptBeingTransferred = null;
    }
  });
}

// Initialize layout and categories on page load
updateLayout();
updateCategoryDropdowns();
updateFiltersUI();

// Export/Import event listeners
const exportBtn = document.getElementById("export-btn");
const importInput = document.getElementById("import-input");

if (exportBtn) {
  exportBtn.addEventListener("click", exportData);
}

if (importInput) {
  importInput.addEventListener("change", handleImportFileSelect);
}

// ============================================================================
// Search Functionality
// ============================================================================

/**
 * Searches prompts by title and content
 * @param {string} query - The search query
 * @returns {Array} Array of matching prompts
 */
function searchPrompts(query) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const prompts = loadPrompts();
  const searchTerm = query.toLowerCase().trim();

  return prompts.filter(prompt => {
    const titleMatch = prompt.title.toLowerCase().includes(searchTerm);
    const contentMatch = prompt.content.toLowerCase().includes(searchTerm);
    return titleMatch || contentMatch;
  });
}

/**
 * Displays search results
 * @param {Array} results - Array of matching prompts
 */
function displaySearchResults(results) {
  if (!searchInput || !searchResults) return;

  const query = searchInput.value.trim();

  if (query.length === 0) {
    searchResults.hidden = true;
    clearSearchBtn.hidden = true;
    currentSearchQuery = "";
    // Restore normal view if category is selected
    if (selectedCategory) {
      renderPrompts();
    }
    return;
  }

  currentSearchQuery = query;

  if (results.length === 0) {
    searchResults.innerHTML = `
      <div class="search-results-title">No results found for "${query}"</div>
    `;
    searchResults.hidden = false;
    clearSearchBtn.hidden = false;
    // Hide prompts list when showing search results
    promptsList.hidden = true;
    emptyState.hidden = true;
    noFiltersSelected.hidden = true;
    return;
  }

  // Build search results HTML
  let resultsHTML = `
    <div class="search-results-title">Found ${results.length} result${
    results.length > 1 ? "s" : ""
  } for "${query}"</div>
  `;

  results.forEach(prompt => {
    const preview = getPreview(prompt.content, 15);
    const category = prompt.group || "Uncategorized";
    resultsHTML += `
      <div class="search-result-item" data-prompt-id="${
        prompt.id
      }" data-category="${category}">
        <div class="search-result-title">${escapeHtml(prompt.title)}</div>
        <div class="search-result-preview">${escapeHtml(preview)}</div>
        <div class="search-result-category">Category: ${escapeHtml(
          category
        )}</div>
      </div>
    `;
  });

  searchResults.innerHTML = resultsHTML;
  searchResults.hidden = false;
  clearSearchBtn.hidden = false;

  // Hide prompts list when showing search results
  promptsList.hidden = true;
  emptyState.hidden = true;
  noCategorySelected.hidden = true;

  // Add click handlers to search result items
  const resultItems = searchResults.querySelectorAll(".search-result-item");
  resultItems.forEach(item => {
    item.addEventListener("click", () => {
      const promptId = item.getAttribute("data-prompt-id");
      const category = item.getAttribute("data-category");
      handleSearchResultClick(promptId, category);
    });
  });
}

/**
 * Escapes HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Handles clicking on a search result
 * @param {string} promptId - The ID of the prompt to show
 * @param {string} category - The category of the prompt
 */
function handleSearchResultClick(promptId, category) {
  // Set the category filter
  selectedCategory = category;
  updateFiltersUI();

  // Clear search
  if (searchInput) {
    searchInput.value = "";
  }
  searchResults.hidden = true;
  clearSearchBtn.hidden = true;
  currentSearchQuery = "";

  // Set the prompt to expand after render
  promptToExpand = promptId;

  // Render prompts (which will expand the selected one)
  renderPrompts();
}

// Search input event listener
if (searchInput) {
  searchInput.addEventListener("input", e => {
    const query = e.target.value.trim();
    if (query.length === 0) {
      displaySearchResults([]);
    } else {
      const results = searchPrompts(query);
      displaySearchResults(results);
    }
  });

  // Also handle Enter key to select first result
  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      const results = searchPrompts(searchInput.value.trim());
      if (results.length > 0) {
        const firstResult = results[0];
        handleSearchResultClick(
          firstResult.id,
          firstResult.group || "Uncategorized"
        );
      }
    }
  });
}

// Clear search button
if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = "";
    }
    displaySearchResults([]);
    searchInput.focus();
  });
}

// ============================================================================
// Prompt Type Templates
// ============================================================================

/**
 * Returns a template for the specified prompt type
 * @param {string} type - The prompt type ("Standard", "Zero Shot", "One Shot", "Few Shot")
 * @returns {string} Template string for the prompt type
 */
function getPromptTypeTemplate(type) {
  switch (type) {
    case "Zero Shot":
      return `[Persona]
Describe your persona here using only a concise, single sentence. ( ex: 'You are a technical writer who prioritizes clarity for beginners').

===

[Task Description]
Describe the task you want the AI to perform here.

===

[Input/Context]
Provide any input, context, or data the AI needs to complete the task.

===

[Instructions]
Specify any specific requirements, constraints, or formatting preferences.

===

Let's think this through step by step.`;

    case "One Shot":
      return `
      [Persona]
      Describe your persona here using only a concise, single sentence. ( ex: 'You are a systematic debugger who checks assumptions').

===

      [Task Description]
Describe the task you want the AI to perform here.

===

[Example]
Input: [Your example input here]
Output: [Your example output here]

===

[Instructions]
Now perform the same task on the following:
[Your actual input to process]

===

Let's think this through step by step.`;

    case "Few Shot":
      return `
      [Persona]
      Describe your persona here using only a concise, single sentence. ( ex: 'You are a solutions architect who considers scalability's).

===

      [Task Description]
Describe the task you want the AI to perform here.

===

[Examples]
Example 1:
Input: [Your first example input]
Output: [Your first example output]

Example 2:
Input: [Your second example input]
Output: [Your second example output]

Example 3:
Input: [Your third example input]
Output: [Your third example output]

===

[Instructions]
Now perform the same task on the following:
[Your actual input to process]

===

Let's think this through step by step.`;

    case "Standard":
      return `
      [Persona]
      Describe your persona here using only a concise, single sentence. ( ex: You are a senior engineer focused on security and performance).

===

      [Your prompt content here]

===

Let's think this through step by step.`;

    default:
      return "";
  }
}

// ============================================================================
// Prompt Type Tooltip System
// ============================================================================

const PROMPT_TYPE_TOOLTIPS = {
  "standard-tooltip": {
    title: "Standard Prompt",
    description:
      "A very basic, one question, one line, indirect request for a task to be done or question to be answered.",
    example:
      "Write a function to calculate the factorial of a number in JavaScript.",
  },
  "zero-shot-tooltip": {
    title: "Zero Shot Prompt",
    description:
      "A direct task request without providing any examples, relying on the AI's general knowledge and reasoning abilities.",
    example: "Translate the following text to French: 'Hello, how are you?'",
  },
  "one-shot-tooltip": {
    title: "One Shot Prompt",
    description:
      "A prompt that includes one example of the desired input-output format before asking the AI to perform the task.",
    example:
      "Convert the following dates to ISO format. Example: 'Jan 15, 2024' → '2024-01-15'. Now convert: 'Mar 22, 2023'",
  },
  "few-shot-tooltip": {
    title: "Few Shot Prompt",
    description:
      "A prompt that includes multiple examples (typically 2-5) of the desired input-output format to help the AI understand the pattern.",
    example:
      "Classify these sentences as positive or negative sentiment. 'I love this product!' → Positive. 'This is terrible.' → Negative. 'Amazing service!' → Positive. Now classify: 'Not impressed with the quality.'",
  },
};

/**
 * Loads tooltip preferences from localStorage
 * @returns {Object} Object mapping tooltip IDs to boolean (true = don't show)
 */
function loadTooltipPreferences() {
  try {
    const stored = localStorage.getItem(TOOLTIP_PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error loading tooltip preferences:", error);
    return {};
  }
}

/**
 * Saves tooltip preferences to localStorage
 * @param {Object} preferences - Object mapping tooltip IDs to boolean
 */
function saveTooltipPreferences(preferences) {
  try {
    localStorage.setItem(TOOLTIP_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error("Error saving tooltip preferences:", error);
  }
}

/**
 * Checks if a tooltip should be shown based on user preferences
 * @param {string} tooltipId - The tooltip ID to check
 * @returns {boolean} True if tooltip should be shown
 */
function shouldShowTooltip(tooltipId) {
  const preferences = loadTooltipPreferences();
  return !preferences[tooltipId]; // Show if not marked as "don't show"
}

/**
 * Marks a tooltip as "do not show again"
 * @param {string} tooltipId - The tooltip ID to mark
 */
function setTooltipDontShow(tooltipId) {
  const preferences = loadTooltipPreferences();
  preferences[tooltipId] = true;
  saveTooltipPreferences(preferences);
}

function showTooltip(tooltipId) {
  if (!promptTypeTooltip) return;

  // Check if user has selected "do not show again" for this tooltip
  if (!shouldShowTooltip(tooltipId)) {
    return;
  }

  const tooltipData = PROMPT_TYPE_TOOLTIPS[tooltipId];
  if (!tooltipData) return;

  // Store current tooltip ID
  currentTooltipId = tooltipId;

  // Update tooltip content
  const tooltipContent = promptTypeTooltip.querySelector(".tooltip-content");
  if (tooltipContent) {
    tooltipContent.innerHTML = `
      <h4>${escapeHtml(tooltipData.title)}</h4>
      <p><strong>Description:</strong> ${escapeHtml(
        tooltipData.description
      )}</p>
      <p><strong>Example:</strong> "${escapeHtml(tooltipData.example)}"</p>
    `;
  }

  // Reset checkbox state
  const checkbox = promptTypeTooltip.querySelector("#tooltip-dont-show-again");
  if (checkbox) {
    checkbox.checked = false;
  }

  // Show tooltip
  promptTypeTooltip.hidden = false;
  promptTypeTooltip.classList.add("show");
}

function hideTooltip() {
  if (promptTypeTooltip) {
    promptTypeTooltip.hidden = true;
    promptTypeTooltip.classList.remove("show");
    currentTooltipId = null;
  }
}

// Handle prompt type selection
if (promptTypeInput) {
  // Track previous type to detect changes
  let previousType = promptTypeInput.value || "";

  promptTypeInput.addEventListener("change", e => {
    const selectedValue = e.target.value;
    const selectedOption = e.target.options[e.target.selectedIndex];
    const tooltipId = selectedOption
      ? selectedOption.getAttribute("data-tooltip-id")
      : null;

    // Show/hide content field based on selection
    if (contentGroup) {
      if (selectedValue && selectedValue.length > 0) {
        contentGroup.hidden = false;
        // Show tooltip for selected type
        if (tooltipId) {
          showTooltip(tooltipId);
        }

        // Pre-fill template based on prompt type
        if (contentInput) {
          // If type changed, replace content with new template
          if (previousType !== selectedValue) {
            // Pre-fill template for all types (including Standard)
            const template = getPromptTypeTemplate(selectedValue);
            if (template) {
              contentInput.value = template;
            }
          }
        }
      } else {
        contentGroup.hidden = true;
        hideTooltip();
        // Clear content when no type is selected
        if (contentInput) {
          contentInput.value = "";
        }
      }
    }

    // Update previous type
    previousType = selectedValue;
  });

  // Note: Tooltip is now shown only when type is selected, not on focus/blur
}

// Handle tooltip Ok button and checkbox
const tooltipOkBtn = document.getElementById("tooltip-ok-btn");
const tooltipDontShowCheckbox = document.getElementById(
  "tooltip-dont-show-again"
);

if (tooltipOkBtn) {
  tooltipOkBtn.addEventListener("click", () => {
    // Check if "do not show again" is checked
    if (
      tooltipDontShowCheckbox &&
      tooltipDontShowCheckbox.checked &&
      currentTooltipId
    ) {
      setTooltipDontShow(currentTooltipId);
    }

    // Hide tooltip
    hideTooltip();
  });
}

// Handle info icon click
if (promptTypeInfoIcon) {
  promptTypeInfoIcon.addEventListener("click", e => {
    e.stopPropagation();
    const selectedOption =
      promptTypeInput.options[promptTypeInput.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const tooltipId = selectedOption.getAttribute("data-tooltip-id");
      if (tooltipId) {
        // Toggle tooltip (respecting preferences)
        if (promptTypeTooltip && !promptTypeTooltip.hidden) {
          hideTooltip();
        } else {
          showTooltip(tooltipId);
        }
      }
    } else {
      // Show general info about prompt types
      const tooltipContent =
        promptTypeTooltip.querySelector(".tooltip-content");
      if (tooltipContent) {
        tooltipContent.innerHTML = `
          <h4>Prompt Types</h4>
          <p>Select a prompt type from the dropdown to see detailed information and examples for that type.</p>
          <p>Available types: Standard, Zero Shot, One Shot, and Few Shot.</p>
        `;
      }
      // Reset checkbox
      if (tooltipDontShowCheckbox) {
        tooltipDontShowCheckbox.checked = false;
      }
      promptTypeTooltip.hidden = false;
      promptTypeTooltip.classList.add("show");
    }
  });
}

// Hide tooltip when clicking outside (but not when clicking inside tooltip)
document.addEventListener("click", e => {
  if (
    promptTypeTooltip &&
    !promptTypeTooltip.contains(e.target) &&
    e.target !== promptTypeInput &&
    e.target !== promptTypeInfoIcon &&
    !e.target.closest("#tooltip-ok-btn") &&
    !e.target.closest("#tooltip-dont-show-again")
  ) {
    hideTooltip();
  }
});

// Initial render
renderPrompts();
