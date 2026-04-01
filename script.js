'use strict';

// --- PLACEHOLDER SUPABASE CONFIG ---
// Replace these with your real Supabase project values
var SUPABASE_URL = window.SUPABASE_URL || 'https://pwwclxpumnfiujamwxuh.supabase.co';
var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3d2NseHB1bW5maXVqYW13eHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzQ5MzUsImV4cCI6MjA5MDA1MDkzNX0.ZIpVagy425hqad8Jt8GK0QkWWID_jKvsKCGnpG3P2sE';

// Utility to check if current user is child (async)
async function isChildUser() {
    if (window.getCurrentUserRole) {
        const role = await window.getCurrentUserRole();
        return role === 'child';
    }
    return false;
}

document.addEventListener('DOMContentLoaded', function () {
        // Role selection modal logic
        var roleSelectModal = document.getElementById('role-select-modal');
        var roleSelectParentBtn = document.getElementById('role-select-parent');
        var roleSelectChildBtn = document.getElementById('role-select-child');
        var roleSelectCancelBtn = document.getElementById('role-select-cancel');

        function showRoleSelectModal() {
            if (roleSelectModal) roleSelectModal.hidden = false;
        }
        function hideRoleSelectModal() {
            if (roleSelectModal) roleSelectModal.hidden = true;
        }
        async function updateUserRoleInHouse(role) {
            // Ensure user and house code are available
            var user = await ensureCloudUser();
            if (!user || !state.cloud.houseCode) return;
            var client = getSupabaseClient();
            if (!client) return;
            // Upsert the role for this user in the house_members table
            var response = await client
                .from('house_members')
                .upsert({
                    house_code: state.cloud.houseCode,
                    user_id: user.id,
                    role: role
                }, { onConflict: 'house_code,user_id' });
            if (response.error) {
                window.alert('Failed to update role: ' + (response.error.message || response.error));
            } else {
                // Optionally, update UI or local state if needed
                setCloudSyncStatus('Role updated', 'Your role is now: ' + role);
            }
        }

        if (roleSelectParentBtn) {
            roleSelectParentBtn.addEventListener('click', function() {
                hideRoleSelectModal();
                updateUserRoleInHouse('parent');
            });
        }
        if (roleSelectChildBtn) {
            roleSelectChildBtn.addEventListener('click', function() {
                hideRoleSelectModal();
                updateUserRoleInHouse('child');
            });
        }
        if (roleSelectCancelBtn) {
            roleSelectCancelBtn.addEventListener('click', function() {
                hideRoleSelectModal();
            });
        }

        // Example: Show the modal after joining a house if no role is set
        // if (userJustJoinedHouse && !userRole) showRoleSelectModal();
    // Options modal tab switching logic
    function showOptionsTab(tab) {
        var optionsTabZonesBtn = document.getElementById('options-tab-zones-btn');
        var optionsTabCloudBtn = document.getElementById('options-tab-cloud-btn');
        var optionsTabShareBtn = document.getElementById('options-tab-share-btn');
        var optionsPaneZones = document.getElementById('options-pane-zones');
        var optionsPaneCloud = document.getElementById('options-pane-cloud');
        var optionsPaneShare = document.getElementById('options-pane-share');
        if (!optionsTabZonesBtn || !optionsTabCloudBtn || !optionsTabShareBtn || !optionsPaneZones || !optionsPaneCloud || !optionsPaneShare) return;
        optionsPaneZones.hidden = tab !== 'zones';
        optionsPaneCloud.hidden = tab !== 'cloud';
        optionsPaneShare.hidden = tab !== 'share';
        optionsTabZonesBtn.classList.toggle('active', tab === 'zones');
        optionsTabCloudBtn.classList.toggle('active', tab === 'cloud');
        optionsTabShareBtn.classList.toggle('active', tab === 'share');
    }
    // Attach tab button listeners every time modal is opened
    function attachOptionsTabListeners() {
        var optionsTabZonesBtn = document.getElementById('options-tab-zones-btn');
        var optionsTabCloudBtn = document.getElementById('options-tab-cloud-btn');
        var optionsTabShareBtn = document.getElementById('options-tab-share-btn');
        if (!optionsTabZonesBtn || !optionsTabCloudBtn || !optionsTabShareBtn) return;
        optionsTabZonesBtn.onclick = function() { showOptionsTab('zones'); };
        optionsTabCloudBtn.onclick = function() { showOptionsTab('cloud'); };
        optionsTabShareBtn.onclick = function() { showOptionsTab('share'); };
    }
    // Ensure the three dots (options) button opens the options panel and resets tabs
    if (editBtn && optionsPanel) {
        editBtn.addEventListener('click', function() {
            attachOptionsTabListeners();
            showOptionsTab('zones');
            optionsPanel.hidden = false;
        });
    }
    // Add a global read-only indicator for child users
    let isReadOnly = false;
    (async function checkChildRole() {
        isReadOnly = await isChildUser();
        if (isReadOnly) {
            // Add a visual indicator to the UI
            let banner = document.createElement('div');
            banner.textContent = 'Read-only mode: Child account';
            banner.style.position = 'fixed';
            banner.style.top = '0';
            banner.style.left = '0';
            banner.style.right = '0';
            banner.style.background = '#f8d7da';
            banner.style.color = '#721c24';
            banner.style.textAlign = 'center';
            banner.style.zIndex = '9999';
            banner.style.fontWeight = 'bold';
            banner.style.padding = '8px 0';
            banner.style.pointerEvents = 'none'; // Ensure banner never blocks pointer events
            banner.style.userSelect = 'none';
            document.body.appendChild(banner);
        }
    })();

    var STORAGE_KEY = 'whats-in-data';

    var LOCATIONS = {
        fridge:   { label: 'Fridge' },
        freezer:  { label: 'Freezer' },
        cupboard: { label: 'Cupboard' },
    };

    var DEFAULT_ASSIGNMENTS = {
        'fridge-door': 'fridge',
        'top-cupboards': 'cupboard',
        'bottom-cupboards': 'cupboard',
    };

    var DEFAULT_NAMES = {
        'fridge-door': 'Fridge',
        'top-cupboards': 'Top cupboards',
        'bottom-cupboards': 'Bottom cupboards',
    };

    var DEFAULT_POSITIONS = {
        'fridge-door':      { left: 77, top: 14, width: 20, height: 42 },
        'top-cupboards':    { left: 22, top:  4, width: 72, height: 32 },
        'bottom-cupboards': { left: 14, top: 56, width: 80, height: 36 },
    };

    var DEFAULT_ROTATIONS = {
        'fridge-door': 0,
        'top-cupboards': 0,
        'bottom-cupboards': 0,
    };

    var state = {
        lists: { fridge: [], freezer: [], cupboard: [] },
        assignments: Object.assign({}, DEFAULT_ASSIGNMENTS),
        names: Object.assign({}, DEFAULT_NAMES),
        positions: JSON.parse(JSON.stringify(DEFAULT_POSITIONS)),
        rotations: Object.assign({}, DEFAULT_ROTATIONS),
        notifiedBbe: {},
        suggestionMemory: {},
        scanAliases: {},
        cloud: {
            enabled: true,
            supabaseUrl: SUPABASE_URL,
            supabaseAnonKey: SUPABASE_ANON_KEY,
            houseCode: 'TESTHOUSE', // Set your default house code here
            deviceId: '',
        },
        lastModified: 0,
    };

    var currentLocation = null;
    var currentHotspot = null;
    var currentEditingItemId = null;
    var scanSelectedLocation = null;
    var scanSelectedHotspot = null;
    var mergeSourceItemId = null;
    var cloudSync = {
        client: null,
        channel: null,
        configKey: '',
        syncTimer: null,
        applyingRemote: false,
        userId: '',
        activeInviteToken: '',
        activeInviteLink: '',
        status: 'Local only',
        detail: 'This device is not connected to a shared house.',
    };

    var homeScreen    = document.getElementById('home-screen');
    var subsectionPanel = document.getElementById('subsection-panel');
    var subsectionTitle = document.getElementById('subsection-title');
    var subsectionClose = document.getElementById('subsection-close');
    var toggleAddItemBtn = document.getElementById('toggle-add-item-btn');
    var addItemForm = document.getElementById('add-item-form');
    var addItemBtn = document.getElementById('add-item-btn');
    var cancelEditBtn = document.getElementById('cancel-edit-btn');
    var removeItemBtn = document.getElementById('remove-item-btn');
    var moveItemBtn = document.getElementById('move-item-btn');
    var moveItemModal = document.getElementById('move-item-modal');
    var moveItemZones = document.getElementById('move-item-zones');
    var moveItemCancel = document.getElementById('move-item-cancel');
    var cloudSyncModal = document.getElementById('cloud-sync-modal');
    var cloudHouseCodeInput = document.getElementById('cloud-house-code');
    var cloudStatusText = document.getElementById('cloud-sync-status');
    var cloudDetailText = document.getElementById('cloud-sync-detail');
    var cloudCreateHouseBtn = document.getElementById('cloud-create-house-btn');
    var cloudSyncNowBtn = document.getElementById('cloud-sync-now-btn');
    var cloudShareInviteBtn = document.getElementById('cloud-share-invite-btn');
    var cloudShowQrBtn = document.getElementById('cloud-show-qr-btn');
    var cloudInvitePanel = document.getElementById('cloud-invite-panel');
    var cloudInviteQrCanvas = document.getElementById('cloud-invite-qr');
    var cloudInviteLinkText = document.getElementById('cloud-invite-link-text');
    var cloudHideQrBtn = document.getElementById('cloud-hide-qr-btn');
    var cloudLeaveHouseBtn = document.getElementById('cloud-leave-house-btn');
    var cloudSyncCancelBtn = document.getElementById('cloud-sync-cancel-btn');
    var iconPickerModal = document.getElementById('icon-picker-modal');
    var iconPickerCurrentIcon = document.getElementById('icon-picker-current-icon');
    var iconPickerCurrentName = document.getElementById('icon-picker-current-name');
    var iconPickerGrid = document.getElementById('icon-picker-grid');
    var iconPickerCancel = document.getElementById('icon-picker-cancel');
    var useItemHeaderBtn = document.getElementById('use-item-header-btn');
    var useItemModal = document.getElementById('use-item-modal');
    var useItemSelect = document.getElementById('use-item-select');
    var useQtyInput = document.getElementById('use-qty-input');
    var useWeightInput = document.getElementById('use-weight-input');
    var applyUseBtn = document.getElementById('apply-use-btn');
    var useItemCancel = document.getElementById('use-item-cancel');
    var scanReceiptBtn = document.getElementById('scan-receipt-btn');
    var receiptFileInput = document.getElementById('receipt-file-input');
    var receiptScanModal = document.getElementById('receipt-scan-modal');
    var scanProgressSection = document.getElementById('scan-progress-section');
    var scanResultsSection = document.getElementById('scan-results-section');
    var scanEmptySection = document.getElementById('scan-empty-section');
    var scanStatusText = document.getElementById('scan-status-text');
    var scanProgressFill = document.getElementById('scan-progress-fill');
    var scanItemList = document.getElementById('scan-item-list');
    var scanSelectAllBtn = document.getElementById('scan-select-all-btn');
    var scanAddBtn = document.getElementById('scan-add-btn');
    var scanCancelBtn = document.getElementById('scan-cancel-btn');
    var scanDebugSection = document.getElementById('scan-debug-section');
    var scanRawText = document.getElementById('scan-raw-text');
    var scanShowRawBtn = document.getElementById('scan-show-raw-btn');
    var scanDebugCloseBtn = document.getElementById('scan-debug-close-btn');
    var scanZoneSelect = document.getElementById('scan-zone-select');
    var mergeModal = document.getElementById('merge-modal');
    var mergeSourceName = document.getElementById('merge-source-name');
    var mergeTargetSelect = document.getElementById('merge-target-select');
    var mergePreview = document.getElementById('merge-preview');
    var mergePreviewIcon = document.getElementById('merge-preview-icon');
    var mergePreviewName = document.getElementById('merge-preview-name');
    var mergePreviewMeta = document.getElementById('merge-preview-meta');
    var mergeConfirmBtn = document.getElementById('merge-confirm-btn');
    var mergeCancelBtn = document.getElementById('merge-cancel-btn');
    var itemNameInput = document.getElementById('item-name');
    var itemSuggestions = document.getElementById('item-suggestions');
    var itemQtyInput = document.getElementById('item-qty');
    var itemWeightInput = document.getElementById('item-weight');
    var itemPackInput = document.getElementById('item-pack');
    var itemBbeInput = document.getElementById('item-bbe');
    var listContainer = document.getElementById('list-container');
    var emptyListMsg  = document.getElementById('empty-list-msg');
    var kitchenStage   = document.getElementById('kitchen-stage');
    var layoutBackBtn  = document.getElementById('layout-back-btn');
    var editBtn        = document.getElementById('edit-zones-btn');
    var installAppBtn  = document.getElementById('install-app-btn');
    var installTopBanner = document.getElementById('install-top-banner');
    var optionsPanel      = document.getElementById('options-panel');
    var optionsNavZonesBtn = document.getElementById('options-nav-zones-btn');
    var optionsNavCloudBtn = document.getElementById('options-nav-cloud-btn');
    var optionsNavShareBtn = document.getElementById('options-nav-share-btn');
    var optionsPaneZones  = document.getElementById('options-pane-zones');
    var optionsPaneCloud  = document.getElementById('options-pane-cloud');
    var optionsPaneShare  = document.getElementById('options-pane-share');
    var optionsEditBtn    = document.getElementById('options-edit-btn');
    var optionsAddZoneBtn = document.getElementById('options-add-zone-btn');
    var optionsRenameZoneSelect = document.getElementById('options-rename-zone-select');
    var optionsRenameZoneBtn = document.getElementById('options-rename-zone-btn');
    var optionsDeleteZoneSelect = document.getElementById('options-delete-zone-select');
    var optionsDeleteZoneBtn = document.getElementById('options-delete-zone-btn');
    var optionsOpenCloudBtn = document.getElementById('options-open-cloud-btn');
    var optionsShareAppBtn = document.getElementById('options-share-app-btn');
    var optionsCloseBtn   = document.getElementById('options-close-btn');
    var optionsCloudStatusText = document.getElementById('options-cloud-status');
    var optionsCloudDetailText = document.getElementById('options-cloud-detail');
    var editMode       = false;
    var deferredInstallPrompt = null;

    var isStandalone =
        (function() {
            var matchMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
            var navStandalone = window.navigator.standalone === true;
            var standalone = matchMediaStandalone || navStandalone;
            console.log('[InstallBanner] Detected standalone mode:', standalone, 'matchMedia:', matchMediaStandalone, 'navigator.standalone:', navStandalone);
            return standalone;
        })();
    var isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    var currentIconItemId = null;

    var ICON_CHOICES = [{ value: '', label: 'Auto', className: 'auto' }].concat([
        '📦', '🛒', '🏠', '⭐', '❤️', '✅', '⚠️', '🔥', '❄️', '🌿',
        '🥩', '🍖', '🍗', '🥓', '🦴', '🥚', '🍳', '🧈', '🧀', '🥛',
        '🐄', '🐖', '🐓', '🐟', '🦐', '🦀', '🦞', '🦪', '🐑', '🦃',
        '🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
        '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑',
        '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅',
        '🥔', '🍠', '🥜', '🫘', '🫛', '🍄', '🥗', '🥬', '🥦', '🥒',
        '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍯',
        '🍚', '🍙', '🍘', '🍥', '🥠', '🥟', '🍝', '🍜', '🍲', '🍛',
        '🍣', '🍱', '🍤', '🍢', '🍡', '🥮', '🍧', '🍨', '🍦', '🍰',
        '🎂', '🧁', '🥧', '🍪', '🍩', '🍫', '🍬', '🍭', '🍮', '🍯',
        '🍕', '🍟', '🍔', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆',
        '🥘', '🫕', '🍳', '🥣', '🥫', '🫙', '🧂', '🧊', '🍽️', '🍴',
        '🥄', '🔪', '☕', '🍵', '🫖', '🧃', '🥤', '🧋', '🍶', '🍺',
        '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍼', '🥛', '💧',
        '🧴', '🧼', '🧽', '🧹', '🪣', '🧺', '🧻', '🗑️', '🫧', '🪥',
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
        '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅',
        '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🪲', '🦋', '🐌', '🐞',
        '🌸', '🌼', '🌻', '🌷', '🪴', '🌱', '🍀', '🌳', '🌲', '🌵',
        '⚽', '🏀', '🎾', '🎳', '🎯', '🎮', '🎲', '🧩', '🎁', '🎈',
        '📱', '💡', '🔋', '🔧', '🪛', '🪚', '🔨', '🧯', '🚿', '🛁'
    ].map(function (icon) {
        return { value: icon, label: icon };
    }));

    function getIconChoices() {
        return ICON_CHOICES;
    }

    function updateInstallUi() {
        // Show install banner/button only if not in standalone mode
        var isNowStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (installTopBanner) {
            installTopBanner.hidden = isNowStandalone;
        }
        if (installAppBtn) {
            installAppBtn.hidden = isNowStandalone;
        }
    }

    function handleInstallRequest() {
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            deferredInstallPrompt.userChoice.finally(function () {
                deferredInstallPrompt = null;
                updateInstallUi();
            });
            return;
        }

        var isInsecureHttp =
            window.location.protocol !== 'https:' &&
            window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1';

        if (isInsecureHttp) {
            window.alert('Install requires HTTPS. Start the secure mobile test script and open the HTTPS URL on your phone.');
            return;
        }

        if (isIOS) {
            window.alert('To install on iPhone/iPad: tap Share in Safari, then tap Add to Home Screen.');
        } else {
            window.alert('Install prompt is not available yet. Open this app in Chrome/Edge over HTTPS, then use browser menu -> Install app or Add to Home screen.');
        }
    }

    var BASE_ITEM_SUGGESTIONS = [
        'Steak', 'Chicken breast', 'Chicken thighs', 'Minced beef', 'Beef burgers', 'Pork chops',
        'Sausages', 'Bacon', 'Ham', 'Turkey breast', 'Salmon', 'Tuna', 'Cod', 'Prawns',
        'Milk', 'Cheddar cheese', 'Mozzarella', 'Yogurt', 'Butter', 'Eggs',
        'Apples', 'Bananas', 'Oranges', 'Grapes', 'Strawberries', 'Blueberries',
        'Tomatoes', 'Onions', 'Potatoes', 'Carrots', 'Peppers', 'Cucumber', 'Broccoli',
        'Mushrooms', 'Spinach', 'Lettuce', 'Avocado',
        'Bread', 'Wraps', 'Bagels', 'Crumpets', 'Pitta bread',
        'Pasta', 'Rice', 'Noodles', 'Baked beans', 'Chopped tomatoes', 'Soup',
        'Pasta sauce', 'Stock cubes', 'Olive oil',
        'Peas', 'Chips', 'Pizza', 'Ice cream',
        'Crisps', 'Crackers', 'Biscuits', 'Chocolate',
        'Orange juice', 'Apple juice', 'Cola', 'Sparkling water', 'Tea bags', 'Coffee',
    ];

    function getHotspotButtons() {
        return kitchenStage.querySelectorAll('.kitchen-hotspot');
    }

    kitchenStage.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    kitchenStage.addEventListener('dragstart', function (e) {
        e.preventDefault();
    });

    function zoneIds() {
        return Object.keys(state.positions);
    }

    function isDefaultZone(hotspotId) {
        return Object.prototype.hasOwnProperty.call(DEFAULT_POSITIONS, hotspotId);
    }

    function getCustomZoneIds() {
        return zoneIds().filter(function (hotspotId) {
            return !isDefaultZone(hotspotId);
        });
    }

    function getZoneDisplayName(hotspotId) {
        return state.names[hotspotId] || DEFAULT_NAMES[hotspotId] || 'Zone';
    }

    function populateRenameZoneSelector() {
        if (!optionsRenameZoneSelect || !optionsRenameZoneBtn) return;

        var allZoneIds = zoneIds();
        optionsRenameZoneSelect.innerHTML = '';

        if (!allZoneIds.length) {
            optionsRenameZoneSelect.disabled = true;
            optionsRenameZoneBtn.disabled = true;
            optionsRenameZoneSelect.innerHTML = '<option value="">No zones</option>';
            return;
        }

        allZoneIds.forEach(function (hotspotId) {
            var option = document.createElement('option');
            option.value = hotspotId;
            option.textContent = getZoneDisplayName(hotspotId);
            optionsRenameZoneSelect.appendChild(option);
        });

        optionsRenameZoneSelect.disabled = false;
        optionsRenameZoneBtn.disabled = false;
    }

    function populateDeleteZoneSelector() {
        if (!optionsDeleteZoneSelect || !optionsDeleteZoneBtn) return;

        var customZoneIds = getCustomZoneIds();
        optionsDeleteZoneSelect.innerHTML = '';

        if (!customZoneIds.length) {
            optionsDeleteZoneSelect.disabled = true;
            optionsDeleteZoneBtn.disabled = true;
            optionsDeleteZoneSelect.innerHTML = '<option value="">No custom zones</option>';
            return;
        }

        customZoneIds.forEach(function (hotspotId) {
            var option = document.createElement('option');
            option.value = hotspotId;
            option.textContent = getZoneDisplayName(hotspotId);
            optionsDeleteZoneSelect.appendChild(option);
        });

        optionsDeleteZoneSelect.disabled = false;
        optionsDeleteZoneBtn.disabled = false;
    }

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    function normalizeDeg(deg) {
        var value = deg % 360;
        return value < 0 ? value + 360 : value;
    }

    function clonePos(pos) {
        return {
            left: Number(pos.left),
            top: Number(pos.top),
            width: Number(pos.width),
            height: Number(pos.height),
        };
    }

    function getDefaultCloudState() {
        return {
            enabled: false,
            supabaseUrl: SUPABASE_URL,
            supabaseAnonKey: SUPABASE_ANON_KEY,
            houseCode: 'YOUR_HOUSE_CODE', // <-- Replace with your actual house code
            enabled: true,
            houseCode: '',
            deviceId: '',
        };
    }

    function createDeviceId() {
        return 'device-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function sanitizeHouseCode(value) {
        return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    }

    function generateHouseCode() {
        return Math.random().toString(36).slice(2, 8).toUpperCase();
    }

    function generateInviteToken() {
        var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        var bytes = new Uint8Array(24);
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes).map(function (value) {
            return alphabet[value % alphabet.length];
        }).join('');
    }

    function getAppBaseUrl() {
        var url = new URL(window.location.href);
        url.hash = '';
        url.search = '';
        return url.toString();
    }

    function buildInviteUrl(token) {
        var url = new URL(getAppBaseUrl());
        url.searchParams.set('invite', token);
        return url.toString();
    }

    function getInviteTokenFromUrl() {
        try {
            return new URL(window.location.href).searchParams.get('invite') || '';
        } catch (error) {
            return '';
        }
    }

    function clearInviteTokenFromUrl() {
        try {
            var url = new URL(window.location.href);
            url.searchParams.delete('invite');
            window.history.replaceState({}, document.title, url.toString());
        } catch (error) {
            // Ignore URL cleanup errors.
        }
    }

    function cloneJson(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function hydrateStateFromObject(stored, options) {
        var preserveCloud = options && options.preserveCloud;
        var prevCloud = state.cloud || {};
        var cloudState = preserveCloud
            ? Object.assign(getDefaultCloudState(), prevCloud)
            : getDefaultCloudState();

        state.lists = { fridge: [], freezer: [], cupboard: [] };
        state.assignments = Object.assign({}, DEFAULT_ASSIGNMENTS);
        state.names = Object.assign({}, DEFAULT_NAMES);
        state.positions = cloneJson(DEFAULT_POSITIONS);
        state.rotations = Object.assign({}, DEFAULT_ROTATIONS);
        state.notifiedBbe = {};
        state.suggestionMemory = {};
        state.scanAliases = {};
        state.lastModified = 0;
        state.cloud = cloudState;

        if (!stored || typeof stored !== 'object') {
            if (!state.cloud.deviceId) state.cloud.deviceId = createDeviceId();
            return;
        }

        if (stored.lists && typeof stored.lists === 'object') {
            ['fridge', 'freezer', 'cupboard'].forEach(function (key) {
                state.lists[key] = Array.isArray(stored.lists[key]) ? stored.lists[key] : [];
            });
        } else {
            ['fridge', 'freezer', 'cupboard'].forEach(function (key) {
                state.lists[key] = Array.isArray(stored[key]) ? stored[key] : [];
            });
        }

        if (stored.assignments && typeof stored.assignments === 'object') {
            Object.keys(stored.assignments).forEach(function (hotspotId) {
                var assigned = stored.assignments[hotspotId];
                if (LOCATIONS[assigned]) {
                    state.assignments[hotspotId] = assigned;
                }
            });
        }

        if (stored.names && typeof stored.names === 'object') {
            Object.keys(stored.names).forEach(function (hotspotId) {
                var name = stored.names[hotspotId];
                if (typeof name === 'string' && name.trim()) {
                    state.names[hotspotId] = name.trim();
                }
            });
        }

        if (stored.positions && typeof stored.positions === 'object') {
            Object.keys(stored.positions).forEach(function (hotspotId) {
                var pos = stored.positions[hotspotId];
                if (pos && typeof pos.left === 'number') {
                    state.positions[hotspotId] = clonePos(pos);
                }
            });
        }

        if (stored.rotations && typeof stored.rotations === 'object') {
            Object.keys(stored.rotations).forEach(function (hotspotId) {
                var r = stored.rotations[hotspotId];
                if (typeof r === 'number' && !isNaN(r)) {
                    state.rotations[hotspotId] = normalizeDeg(r);
                }
            });
        }

        if (stored.notifiedBbe && typeof stored.notifiedBbe === 'object') {
            state.notifiedBbe = Object.assign({}, stored.notifiedBbe);
        }

        if (stored.suggestionMemory && typeof stored.suggestionMemory === 'object') {
            state.suggestionMemory = Object.assign({}, stored.suggestionMemory);
        }

        if (stored.scanAliases && typeof stored.scanAliases === 'object') {
            state.scanAliases = Object.assign({}, stored.scanAliases);
        }

        state.lastModified = Number(stored.lastModified) || 0;

        if (!preserveCloud && stored.cloud && typeof stored.cloud === 'object') {
            // Only copy valid values from stored.cloud, never overwrite supabaseUrl, anonKey, or houseCode with empty/invalid
            Object.keys(stored.cloud).forEach(function(key) {
                if (["supabaseUrl","supabaseAnonKey","houseCode","enabled"].indexOf(key) === -1) {
                    state.cloud[key] = stored.cloud[key];
                }
            });
        }
        // Always enforce valid Supabase config
        state.cloud.supabaseUrl = SUPABASE_URL;
        state.cloud.supabaseAnonKey = SUPABASE_ANON_KEY;
        // Only set default house code if not present in storage
        if (!state.cloud.houseCode || typeof state.cloud.houseCode !== 'string' || !state.cloud.houseCode.trim() || state.cloud.houseCode === 'YOUR_HOUSE_CODE') {
            if (stored && stored.cloud && typeof stored.cloud.houseCode === 'string' && stored.cloud.houseCode.trim() && stored.cloud.houseCode !== 'YOUR_HOUSE_CODE') {
                state.cloud.houseCode = stored.cloud.houseCode.trim();
            } else {
                state.cloud.houseCode = 'YOUR_HOUSE_CODE'; // Set to a real house code or let user create one
            }
        }
        state.cloud.enabled = true;
        if (!state.cloud.deviceId) {
            state.cloud.deviceId = createDeviceId();
        }
    }

    function ensureZoneState(hotspotId) {
        if (!state.positions[hotspotId]) {
            if (DEFAULT_POSITIONS[hotspotId]) {
                state.positions[hotspotId] = clonePos(DEFAULT_POSITIONS[hotspotId]);
            } else {
                state.positions[hotspotId] = { left: 34, top: 34, width: 24, height: 18 };
            }
        }
        if (!state.names[hotspotId]) {
            state.names[hotspotId] = DEFAULT_NAMES[hotspotId] || 'Zone';
        }
        if (!state.assignments[hotspotId] || !LOCATIONS[state.assignments[hotspotId]]) {
            state.assignments[hotspotId] = DEFAULT_ASSIGNMENTS[hotspotId] || 'cupboard';
        }
        if (typeof state.rotations[hotspotId] !== 'number' || isNaN(state.rotations[hotspotId])) {
            state.rotations[hotspotId] = DEFAULT_ROTATIONS[hotspotId] || 0;
        }

        var p = state.positions[hotspotId];
        state.positions[hotspotId] = {
            left: clamp(Number(p.left) || 0, 0, 92),
            top: clamp(Number(p.top) || 0, 0, 92),
            width: clamp(Number(p.width) || 20, 8, 100),
            height: clamp(Number(p.height) || 20, 8, 100),
        };
        state.rotations[hotspotId] = normalizeDeg(Number(state.rotations[hotspotId]) || 0);
    }

    function loadData() {
        try {
            var stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
            hydrateStateFromObject(stored, { preserveCloud: false });
        } catch (e) { /* use defaults */ }

        Object.keys(DEFAULT_POSITIONS).forEach(function (id) {
            ensureZoneState(id);
        });

        Object.keys(state.positions).forEach(function (id) {
            ensureZoneState(id);
        });

        // Always enforce valid Supabase config after loading
        state.cloud.supabaseUrl = SUPABASE_URL;
        state.cloud.supabaseAnonKey = SUPABASE_ANON_KEY;
        // Only set default house code if not present in storage
        if (!state.cloud.houseCode || typeof state.cloud.houseCode !== 'string' || !state.cloud.houseCode.trim() || state.cloud.houseCode === 'YOUR_HOUSE_CODE') {
            if (stored && stored.cloud && typeof stored.cloud.houseCode === 'string' && stored.cloud.houseCode.trim() && stored.cloud.houseCode !== 'YOUR_HOUSE_CODE') {
                state.cloud.houseCode = stored.cloud.houseCode.trim();
            } else {
                state.cloud.houseCode = 'YOUR_HOUSE_CODE'; // Set to a real house code or let user create one
            }
        }
        state.cloud.enabled = true;
    }

    function getSyncableState() {
        return {
            lists: cloneJson(state.lists),
            assignments: cloneJson(state.assignments),
            names: cloneJson(state.names),
            positions: cloneJson(state.positions),
            rotations: cloneJson(state.rotations),
            notifiedBbe: cloneJson(state.notifiedBbe),
            suggestionMemory: cloneJson(state.suggestionMemory),
            scanAliases: cloneJson(state.scanAliases),
            lastModified: state.lastModified || 0,
        };
    }

    function persistLocalState() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    }

    function saveData(options) {
        var opts = options || {};
        if (!opts.preserveTimestamp) {
            state.lastModified = Date.now();
        }
        persistLocalState();
        updateCloudSyncUi();
        if (!opts.skipSync) {
            scheduleCloudPush();
        }
    }

    function hasLocalHouseData() {
        return ['fridge', 'freezer', 'cupboard'].some(function (key) {
            return (state.lists[key] || []).length > 0;
        }) || Object.keys(state.positions).length > Object.keys(DEFAULT_POSITIONS).length;
    }

    function setCloudSyncStatus(status, detail) {
        cloudSync.status = status || 'Local only';
        cloudSync.detail = detail || '';
        updateCloudSyncUi();
    }

    function updateCloudSyncUi() {
        var houseCode = sanitizeHouseCode(state.cloud && state.cloud.houseCode);
        var connected = !!(state.cloud && state.cloud.enabled && houseCode);

        if (optionsCloudStatusText) {
            optionsCloudStatusText.textContent = connected
                ? ('House ' + houseCode + ' \u2022 ' + cloudSync.status)
                : cloudSync.status;
        }

        if (optionsCloudDetailText) {
            optionsCloudDetailText.textContent = connected
                ? cloudSync.detail
                : 'Create a house on one device, then invite other devices with a secure link or QR code.';
        }

        if (cloudStatusText) {
            cloudStatusText.textContent = cloudSync.status;
        }

        if (cloudDetailText) {
            cloudDetailText.textContent = cloudSync.detail;
        }

        if (cloudShareInviteBtn) {
            cloudShareInviteBtn.disabled = !connected;
        }

        if (cloudShowQrBtn) {
            cloudShowQrBtn.disabled = !connected;
        }

        if (cloudLeaveHouseBtn) {
            cloudLeaveHouseBtn.disabled = !connected;
        }

        if (cloudSyncNowBtn) {
            cloudSyncNowBtn.disabled = !connected;
        }
    }

    function populateCloudSyncForm() {
        if (cloudHouseCodeInput) cloudHouseCodeInput.value = state.cloud.houseCode || '';
        updateCloudSyncUi();
    }

    function openCloudSyncModal() {
        populateCloudSyncForm();
        hideInvitePanel();
        cloudSyncModal.hidden = false;
    }

    function closeCloudSyncModal() {
        hideInvitePanel();
        cloudSyncModal.hidden = true;
    }

    function readCloudFormState() {
        state.cloud.supabaseUrl = SUPABASE_URL;
        state.cloud.supabaseAnonKey = SUPABASE_ANON_KEY;
        state.cloud.houseCode = sanitizeHouseCode(cloudHouseCodeInput.value);
        if (!state.cloud.deviceId) {
            state.cloud.deviceId = createDeviceId();
        }
    }

    function getSupabaseClient(forceNew) {
        if (!state.cloud.supabaseUrl || !state.cloud.supabaseAnonKey) {
            setCloudSyncStatus('Setup required', 'Enter your Supabase URL and anon key first.');
            return null;
        }

        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            setCloudSyncStatus('Unavailable', 'Supabase client library failed to load.');
            return null;
        }

        // Only create the client once per session
        if (cloudSync.client) {
            return cloudSync.client;
        }

        cloudSync.client = window.supabase.createClient(state.cloud.supabaseUrl, state.cloud.supabaseAnonKey, {
            auth: { persistSession: true, autoRefreshToken: true },
        });
        cloudSync.configKey = state.cloud.supabaseUrl + '::' + state.cloud.supabaseAnonKey;
        return cloudSync.client;
    }

    async function ensureCloudUser() {
        var client = getSupabaseClient();
        if (!client) return null;

        var response = await client.auth.getUser();
        if (response.error) {
            if (state.cloud && state.cloud.enabled) {
                setCloudSyncStatus('Auth failed', response.error.message || 'Unable to read device identity.');
                alert('Auth error: ' + JSON.stringify(response.error));
            }
            // If cloud sync is not enabled, fail silently
            return null;
        }

        var user = response.data && response.data.user;
        if (!user) {
            var signIn = await client.auth.signInAnonymously();
            if (state.cloud && state.cloud.enabled) {
                alert('signInAnonymously result: ' + JSON.stringify(signIn));
            }
            if (signIn.error) {
                if (state.cloud && state.cloud.enabled) {
                    setCloudSyncStatus('Auth failed', signIn.error.message || 'Enable anonymous sign-ins in Supabase Auth to use secure invites.');
                }
                // If cloud sync is not enabled, fail silently
                return null;
            }
            user = signIn.data && signIn.data.user;
        }

        cloudSync.userId = user && user.id ? user.id : '';
        return user || null;
    }

    function hideInvitePanel() {
        cloudSync.activeInviteToken = '';
        cloudSync.activeInviteLink = '';
        if (cloudInvitePanel) cloudInvitePanel.hidden = true;
        if (cloudInviteLinkText) cloudInviteLinkText.textContent = '';
        if (cloudInviteQrCanvas) {
            var ctx = cloudInviteQrCanvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, cloudInviteQrCanvas.width, cloudInviteQrCanvas.height);
            }
        }
    }

    function disconnectCloudChannel() {
        if (cloudSync.channel && cloudSync.client) {
            cloudSync.client.removeChannel(cloudSync.channel);
        }
        cloudSync.channel = null;
    }

    function refreshUiAfterSharedState() {
        Object.keys(DEFAULT_POSITIONS).forEach(function (id) {
            ensureZoneState(id);
        });
        Object.keys(state.positions).forEach(function (id) {
            ensureZoneState(id);
        });
        cleanBbeNotifiedMap();
        ensureZoneElements();
        applyAllNames();
        applyPositions();
        updateHotspotMeta();
        if (!subsectionPanel.hidden && currentHotspot && currentLocation) {
            currentLocation = getAssignedList(currentHotspot);
            subsectionTitle.textContent = state.names[currentHotspot] || DEFAULT_NAMES[currentHotspot] || LOCATIONS[currentLocation].label;
            renderList();
        }
        triggerBbeWarnings(false);
    }

    function applyRemoteSharedState(remoteState, options) {
        var opts = options || {};
        if (!remoteState || typeof remoteState !== 'object') return false;

        var remoteModified = Number(remoteState.lastModified) || 0;
        var localModified = Number(state.lastModified) || 0;
        if (!opts.force && remoteModified && localModified && remoteModified <= localModified) {
            return false;
        }

        cloudSync.applyingRemote = true;
        hydrateStateFromObject(Object.assign({}, remoteState), { preserveCloud: true });
        refreshUiAfterSharedState();
        saveData({ preserveTimestamp: true, skipSync: true });
        cloudSync.applyingRemote = false;
        setCloudSyncStatus('Synced', 'Updated from house ' + state.cloud.houseCode + '.');
        return true;
    }

    async function pushStateToCloud(reason) {
        if (cloudSync.applyingRemote || !state.cloud.enabled || !state.cloud.houseCode) return false;
        if (!navigator.onLine) {
            setCloudSyncStatus('Offline', 'Changes are stored locally and will sync when you are back online.');
            return false;
        }

        var user = await ensureCloudUser();
        if (!user) return false;

        var client = getSupabaseClient();
        if (!client) return false;

        setCloudSyncStatus('Syncing…', reason || 'Sending changes to the shared house…');

        var payload = {
            house_code: state.cloud.houseCode,
            data: getSyncableState(),
            updated_by: state.cloud.deviceId,
            updated_at: new Date().toISOString(),
        };

        var response = await client
            .from('shared_houses')
            .update(payload)
            .eq('house_code', state.cloud.houseCode)
            .select('house_code')
            .maybeSingle();

        if (response.error || !response.data) {
            setCloudSyncStatus('Sync failed', response.error.message || 'Unable to save shared house data.');
            return false;
        }

        setCloudSyncStatus('Synced', 'House ' + state.cloud.houseCode + ' is up to date.');
        return true;
    }

    async function pullStateFromCloud(options) {
        var opts = options || {};
        if (!state.cloud.enabled || !state.cloud.houseCode) return false;

        var user = await ensureCloudUser();
        if (!user) return false;

        var client = getSupabaseClient();
        if (!client) return false;

        if (!navigator.onLine) {
            setCloudSyncStatus('Offline', 'Using the local copy until the device reconnects.');
            return false;
        }

        setCloudSyncStatus('Syncing…', 'Checking house ' + state.cloud.houseCode + '…');

        var response = await client
            .from('shared_houses')
            .select('house_code, data, updated_by, updated_at')
            .eq('house_code', state.cloud.houseCode)
            .maybeSingle();

        if (response.error) {
            setCloudSyncStatus('Sync failed', response.error.message || 'Unable to load the shared house.');
            return false;
        }

        if (!response.data || !response.data.data) {
            if (opts.createIfMissing) {
                return pushStateToCloud('Creating shared house…');
            }
            setCloudSyncStatus('Not found', 'No shared house exists for code ' + state.cloud.houseCode + '.');
            return false;
        }

        var remoteState = response.data.data;
        var remoteModified = Number(remoteState.lastModified) || 0;
        var localModified = Number(state.lastModified) || 0;

        if (opts.forceApply || remoteModified > localModified) {
            return applyRemoteSharedState(remoteState, { force: !!opts.forceApply });
        }

        if (opts.pushIfNewer && localModified > remoteModified) {
            return pushStateToCloud('Local copy is newer. Updating shared house…');
        }

        setCloudSyncStatus('Synced', 'House ' + state.cloud.houseCode + ' is up to date.');
        return true;
    }

    async function subscribeToCloudHouse() {
        if (!state.cloud.enabled || !state.cloud.houseCode) return;

        var user = await ensureCloudUser();
        if (!user) return;

        var client = getSupabaseClient();
        if (!client) return;

        disconnectCloudChannel();
        cloudSync.channel = client
            .channel('house-' + state.cloud.houseCode)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'shared_houses',
                filter: 'house_code=eq.' + state.cloud.houseCode,
            }, function (payload) {
                if (!payload || !payload.new) return;
                if (payload.new.updated_by === state.cloud.deviceId) return;
                if (payload.new.data) {
                    applyRemoteSharedState(payload.new.data);
                }
            });

        cloudSync.channel.subscribe(function (status) {
            if (status === 'SUBSCRIBED') {
                setCloudSyncStatus('Connected', 'Live sync is active for house ' + state.cloud.houseCode + '.');
            } else if (status === 'CHANNEL_ERROR') {
                setCloudSyncStatus('Realtime error', 'Live updates could not be started. Manual sync still works.');
            }
        });
    }

    function scheduleCloudPush() {
        if (cloudSync.applyingRemote || !state.cloud.enabled || !state.cloud.houseCode) return;
        window.clearTimeout(cloudSync.syncTimer);
        cloudSync.syncTimer = window.setTimeout(function () {
            pushStateToCloud('Syncing latest changes…');
        }, 600);
    }

    async function createSharedHouse() {
        readCloudFormState();
        if (!state.cloud.houseCode) {
            state.cloud.houseCode = generateHouseCode();
            cloudHouseCodeInput.value = state.cloud.houseCode;
        }

        var user = await ensureCloudUser();
        if (!user) return;

        state.cloud.enabled = true;
        saveData({ preserveTimestamp: true, skipSync: true });

        var client = getSupabaseClient(true);
        if (!client) return;

        if (!state.lastModified) {
            state.lastModified = Date.now();
            persistLocalState();
        }

        setCloudSyncStatus('Syncing…', 'Creating shared house…');
        var createResponse = await client
            .from('shared_houses')
            .insert({
                house_code: state.cloud.houseCode,
                owner_user_id: user.id,
                data: getSyncableState(),
                updated_by: state.cloud.deviceId,
                updated_at: new Date().toISOString(),
            });

        if (createResponse.error) {
            var errorMessage = createResponse.error.message || 'Unable to create shared house.';
            if (/duplicate|unique/i.test(errorMessage)) {
                setCloudSyncStatus('Code taken', 'That house code already exists. Try another one.');
            } else {
                setCloudSyncStatus('Create failed', errorMessage);
            }
            return;
        }

        var memberResponse = await client
            .from('house_members')
            .upsert({
                house_code: state.cloud.houseCode,
                user_id: user.id,
                role: 'owner',
            }, { onConflict: 'house_code,user_id' });

        if (memberResponse.error) {
            setCloudSyncStatus('Create failed', memberResponse.error.message || 'Unable to add this device to the new house.');
            return;
        }

        await subscribeToCloudHouse();
        setCloudSyncStatus('Connected', 'Created house ' + state.cloud.houseCode + '. Invite the other device with a secure link or QR code.');
    }

    async function createHouseInvite() {
        if (!state.cloud.enabled || !state.cloud.houseCode) {
            window.alert('Create a house first.');
            return '';
        }

        var user = await ensureCloudUser();
        if (!user) return '';

        var client = getSupabaseClient();
        if (!client) return '';

        var inviteToken = generateInviteToken();
        var expiresAt = new Date(Date.now() + (10 * 60 * 1000)).toISOString();

        setCloudSyncStatus('Syncing…', 'Creating invite…');
        var inviteResponse = await client
            .from('house_invites')
            .insert({
                invite_token: inviteToken,
                house_code: state.cloud.houseCode,
                created_by: user.id,
                expires_at: expiresAt,
                max_uses: 1,
                use_count: 0,
            });

        if (inviteResponse.error) {
            setCloudSyncStatus('Invite failed', inviteResponse.error.message || 'Unable to create invite.');
            return '';
        }

        cloudSync.activeInviteToken = inviteToken;
        cloudSync.activeInviteLink = buildInviteUrl(inviteToken);
        setCloudSyncStatus('Connected', 'Invite ready. It will expire in 10 minutes.');
        return cloudSync.activeInviteLink;
    }

    async function shareHouseInvite() {
        var inviteLink = await createHouseInvite();
        if (!inviteLink) return;

        var shareData = {
            title: document.title || "What's in?",
            text: 'Join my shared house in What\'s in?:',
            url: inviteLink,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    return;
                }
            }
        }

        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(inviteLink);
                window.alert('Invite link copied.');
                return;
            } catch (error) {
                // Fall through to prompt.
            }
        }

        window.prompt('Copy this invite link:', inviteLink);
    }

    async function showHouseInviteQr() {
        var inviteLink = await createHouseInvite();
        if (!inviteLink || !cloudInviteQrCanvas || !window.QRCode || typeof window.QRCode.toCanvas !== 'function') return;

        await window.QRCode.toCanvas(cloudInviteQrCanvas, inviteLink, {
            width: 220,
            margin: 1,
            color: {
                dark: '#2d7a3a',
                light: '#ffffff',
            },
        });
        if (cloudInviteLinkText) {
            cloudInviteLinkText.textContent = inviteLink;
        }
        if (cloudInvitePanel) {
            cloudInvitePanel.hidden = false;
        }
    }

    async function redeemInviteToken(inviteToken, options) {
        var opts = options || {};
        var token = String(inviteToken || '').trim();
        if (!token) return false;

        if (hasLocalHouseData() && !opts.skipLocalConfirm) {
            if (!window.confirm('Joining a shared house will replace the current local house data on this device. Continue?')) {
                return false;
            }
        }

        var user = await ensureCloudUser();
        if (!user) return false;

        var client = getSupabaseClient();
        if (!client) return false;

        setCloudSyncStatus('Syncing…', 'Checking invite…');
        var inviteResponse = await client
            .from('house_invites')
            .select('invite_token, house_code, expires_at, max_uses, use_count')
            .eq('invite_token', token)
            .maybeSingle();

        if (inviteResponse.error || !inviteResponse.data) {
            setCloudSyncStatus('Invite invalid', inviteResponse.error && inviteResponse.error.message ? inviteResponse.error.message : 'That invite link is no longer valid.');
            return false;
        }

        var invite = inviteResponse.data;
        if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
            setCloudSyncStatus('Invite expired', 'That invite has expired. Ask for a new one.');
            return false;
        }

        if ((Number(invite.use_count) || 0) >= (Number(invite.max_uses) || 1)) {
            setCloudSyncStatus('Invite used', 'That invite has already been used. Ask for a new one.');
            return false;
        }

        var memberResponse = await client
            .from('house_members')
            .upsert({
                house_code: invite.house_code,
                user_id: user.id,
                role: 'member',
            }, { onConflict: 'house_code,user_id' });

        if (memberResponse.error) {
            setCloudSyncStatus('Join failed', memberResponse.error.message || 'Unable to add this device to the shared house.');
            return false;
        }

        await client
            .from('house_invites')
            .update({
                use_count: (Number(invite.use_count) || 0) + 1,
                claimed_by: user.id,
                claimed_at: new Date().toISOString(),
            })
            .eq('invite_token', token);

        state.cloud.houseCode = sanitizeHouseCode(invite.house_code);
        state.cloud.enabled = true;
        saveData({ preserveTimestamp: true, skipSync: true });

        var pulled = await pullStateFromCloud({ forceApply: true, pushIfNewer: false, createIfMissing: false });
        if (!pulled) return false;

        await subscribeToCloudHouse();
        clearInviteTokenFromUrl();
        setCloudSyncStatus('Connected', 'Joined house ' + state.cloud.houseCode + '.');
        return true;
    }

    function leaveSharedHouse() {
        if (!state.cloud.enabled || !state.cloud.houseCode) return;
        if (!window.confirm('Leave this shared house on this device? Your current local copy will stay on the device.')) {
            return;
        }

        disconnectCloudChannel();
        hideInvitePanel();
        state.cloud.enabled = false;
        state.cloud.houseCode = '';
        saveData({ preserveTimestamp: true, skipSync: true });
        setCloudSyncStatus('Local only', 'This device is no longer connected to a shared house.');
        populateCloudSyncForm();
    }

    async function syncSharedHouseNow() {
        if (!state.cloud.enabled || !state.cloud.houseCode) {
            window.alert('Create a house or open an invite link first.');
            return;
        }
        await pullStateFromCloud({ pushIfNewer: true, createIfMissing: false });
    }

    async function initCloudSync() {
        await ensureCloudUser();
        updateCloudSyncUi();

        var inviteToken = getInviteTokenFromUrl();
        if (inviteToken) {
            await redeemInviteToken(inviteToken);
            return;
        }

        if (!state.cloud.enabled || !state.cloud.houseCode) {
            return;
        }

        await subscribeToCloudHouse();
        await pullStateFromCloud({ pushIfNewer: true, createIfMissing: false });
    }

    function resetAddItemInputs() {
        itemNameInput.value = '';
        itemQtyInput.value = '';
        itemWeightInput.value = '';
        itemPackInput.value = '';
        itemBbeInput.value = '';
    }

    function genId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function getAssignedList(hotspotId) {
        var assigned = state.assignments[hotspotId];
        return LOCATIONS[assigned] ? assigned : 'cupboard';
    }

    function itemBelongsToHotspot(item, hotspotId) {
        if (!item) return false;
        return !item.zoneId || item.zoneId === hotspotId;
    }

    function updateHotspotMeta() {
        getHotspotButtons().forEach(function (button) {
            var hotspotId = button.dataset.hotspot;
            var locationId = getAssignedList(hotspotId);
            var items = state.lists[locationId] || [];
            var count = items.filter(function (item) {
                return itemBelongsToHotspot(item, hotspotId);
            }).length;
            var label = LOCATIONS[locationId].label;
            var meta = button.querySelector('.hotspot-meta');
            if (meta) {
                meta.textContent = label + ': ' + count;
            }
        });
    }

    function showHome() {
        currentLocation = null;
        currentHotspot = null;
        currentEditingItemId = null;
        homeScreen.hidden = false;
        subsectionPanel.hidden = true;
        addItemForm.hidden = true;
        toggleAddItemBtn.textContent = '+';
        addItemBtn.textContent = 'Add item';
        cancelEditBtn.hidden = true;
        removeItemBtn.hidden = true;
        resetAddItemInputs();
        updateHotspotMeta();
    }

    function showList(hotspotId, location) {
        currentHotspot = hotspotId;
        currentLocation = location;
        currentEditingItemId = null;
        subsectionTitle.textContent = state.names[hotspotId] || DEFAULT_NAMES[hotspotId] || LOCATIONS[location].label;
        addItemForm.hidden = true;
        toggleAddItemBtn.textContent = '+';
        addItemBtn.textContent = 'Add item';
        cancelEditBtn.hidden = true;
        removeItemBtn.hidden = true;
        resetAddItemInputs();
        subsectionPanel.hidden = false;
        renderList();
    }

    function resetItemFormState() {
        currentEditingItemId = null;
        resetAddItemInputs();
        delete itemNameInput.dataset.selectedIcon;
        hideItemSuggestions();
        addItemForm.hidden = true;
        toggleAddItemBtn.textContent = '+';
        addItemBtn.textContent = 'Add item';
        cancelEditBtn.hidden = true;
        removeItemBtn.hidden = true;
        moveItemBtn.hidden = true;
    }

    function applyNameToHotspot(hotspotId) {
        getHotspotButtons().forEach(function (button) {
            if (button.dataset.hotspot === hotspotId) {
                var name = state.names[hotspotId] || DEFAULT_NAMES[hotspotId] || 'Area';
                button.dataset.name = name;
                button.setAttribute('aria-label', name + ' area');
            }
        });
    }

    function applyAllNames() {
        zoneIds().forEach(function (hotspotId) {
            applyNameToHotspot(hotspotId);
        });
    }

    function renameZone(hotspotId, promptText) {
        if (!hotspotId) return false;

        var currentName = getZoneDisplayName(hotspotId);
        var nextName = window.prompt(promptText || 'Rename this appliance/area:', currentName);
        if (nextName === null) return false;

        var cleanName = nextName.trim();
        if (!cleanName) return false;

        state.names[hotspotId] = cleanName;
        applyNameToHotspot(hotspotId);

        if (currentHotspot === hotspotId) {
            subsectionTitle.textContent = cleanName;
        }

        populateRenameZoneSelector();
        populateDeleteZoneSelector();
        saveData();
        return true;
    }

    function inferItemIcon(name) {
        var text = String(name || '').toLowerCase();
        if (/apple|banana|orange|berry|grape|pear|lemon|lime|kiwi|mango|melon|pineapple/.test(text)) return '\ud83c\udf4e';
        if (/carrot|potato|onion|lettuce|spinach|pepper|cucumber|broccoli|mushroom|corn|tomato/.test(text)) return '\ud83e\udd55';
        if (/milk|cheese|yogurt|butter|cream|egg/.test(text)) return '\ud83e\udd5b';
        if (/chicken|beef|pork|bacon|ham|sausage|turkey|mince|fish|salmon|tuna|prawn|shrimp/.test(text)) return '\ud83e\udd69';
        if (/bread|bagel|bun|wrap|tortilla|toast/.test(text)) return '\ud83c\udf5e';
        if (/cake|biscuit|cookie|chocolate|sweet/.test(text)) return '\ud83c\udf6a';
        if (/chips|crisps|snack|nuts/.test(text)) return '\ud83e\udd68';
        if (/juice|drink|soda|cola|water|tea|coffee/.test(text)) return '\ud83e\udd64';
        if (/soup|beans|tinned|canned|can|jar|sauce/.test(text)) return '\ud83e\udd6b';
        return '\ud83d\udce6';
    }

    function normalizeItemName(name, locationId) {
        var clean = String(name || '').trim();
        if (locationId === 'freezer') {
            clean = clean.replace(/^frozen\s+/i, '').trim();
        }
        return clean;
    }

    function normalizeItemIcon(icon, name) {
        return icon === '\u2744\ufe0f' ? inferItemIcon(name) : (icon || inferItemIcon(name));
    }

    function rememberSuggestion(name, icon) {
        var cleanName = String(name || '').trim();
        if (!cleanName) return;
        var key = cleanName.toLowerCase();
        state.suggestionMemory[key] = {
            name: cleanName,
            icon: normalizeItemIcon(icon, cleanName),
        };
    }

    function getSuggestionPool() {
        var byName = {};

        BASE_ITEM_SUGGESTIONS.forEach(function (name) {
            byName[name.toLowerCase()] = { name: name, icon: inferItemIcon(name) };
        });

        Object.keys(state.suggestionMemory || {}).forEach(function (key) {
            var remembered = state.suggestionMemory[key];
            if (!remembered || !remembered.name) return;
            byName[key] = {
                name: remembered.name,
                icon: normalizeItemIcon(remembered.icon, remembered.name),
            };
        });

        Object.keys(state.lists).forEach(function (locationKey) {
            (state.lists[locationKey] || []).forEach(function (item) {
                if (!item || !item.name) return;
                var clean = normalizeItemName(item.name, locationKey);
                if (!clean) return;
                byName[clean.toLowerCase()] = {
                    name: clean,
                    icon: normalizeItemIcon(item.icon, clean),
                };
            });
        });

        return Object.keys(byName).map(function (key) { return byName[key]; });
    }

    function hideItemSuggestions() {
        itemSuggestions.hidden = true;
        itemSuggestions.innerHTML = '';
    }

    function renderItemSuggestions(query) {
        var text = String(query || '').trim().toLowerCase();

        var suggestions = getSuggestionPool()
            .filter(function (entry) {
                if (!text) return true;
                return entry.name.toLowerCase().indexOf(text) !== -1;
            })
            .sort(function (a, b) {
                var aStarts = a.name.toLowerCase().indexOf(text) === 0 ? 0 : 1;
                var bStarts = b.name.toLowerCase().indexOf(text) === 0 ? 0 : 1;
                if (aStarts !== bStarts) return aStarts - bStarts;
                return a.name.localeCompare(b.name);
            })
            .slice(0, text ? 50 : 20);

        if (!suggestions.length) {
            hideItemSuggestions();
            return;
        }

        itemSuggestions.innerHTML = '';
        suggestions.forEach(function (entry) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'item-suggestion-btn';
            btn.innerHTML = '<span class="item-suggestion-icon">' + entry.icon + '</span><span>' + entry.name + '</span>';

            btn.addEventListener('mousedown', function (e) {
                e.preventDefault();
            });
            btn.addEventListener('click', function () {
                itemNameInput.value = entry.name;
                itemNameInput.dataset.selectedIcon = entry.icon;
                hideItemSuggestions();
            });

            itemSuggestions.appendChild(btn);
        });

        itemSuggestions.hidden = false;
    }

    function formatBbeDate(value) {
        if (!value) return '';
        var parsed = new Date(value + 'T00:00:00');
        if (isNaN(parsed.getTime())) return value;
        return parsed.toLocaleDateString();
    }

    function setSelectValue(selectEl, value) {
        Array.prototype.slice.call(selectEl.querySelectorAll('option[data-temp="1"]')).forEach(function (option) {
            option.remove();
        });

        if (!value) {
            selectEl.value = '';
            return;
        }

        var hasOption = Array.prototype.some.call(selectEl.options, function (option) {
            return option.value === value;
        });

        if (!hasOption) {
            var tempOption = document.createElement('option');
            tempOption.value = value;
            tempOption.textContent = value;
            tempOption.dataset.temp = '1';
            selectEl.appendChild(tempOption);
        }

        selectEl.value = value;
    }

    function daysUntilDate(dateString) {
        if (!dateString) return null;
        var target = new Date(dateString + 'T00:00:00');
        if (isNaN(target.getTime())) return null;

        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.round((target.getTime() - today.getTime()) / 86400000);
    }

    function getSoonExpiringItems() {
        var soon = [];

        Object.keys(state.lists).forEach(function (locationKey) {
            var items = state.lists[locationKey] || [];
            items.forEach(function (item) {
                if (!item || !item.id || !item.bbeDate) return;
                var days = daysUntilDate(item.bbeDate);
                if (days === null) return;
                if (days >= 0 && days <= 2 && !state.notifiedBbe[item.id]) {
                    soon.push({
                        item: item,
                        locationKey: locationKey,
                        days: days,
                    });
                }
            });
        });

        return soon;
    }

    function requestNotificationPermission(allowPrompt) {
        if (!('Notification' in window)) {
            return Promise.resolve('denied');
        }

        if (Notification.permission === 'granted' || Notification.permission === 'denied') {
            return Promise.resolve(Notification.permission);
        }

        if (!allowPrompt) {
            return Promise.resolve('default');
        }

        return Notification.requestPermission();
    }

    function primeNotificationPermissionOnGesture() {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'default') return;

        function onFirstGesture() {
            requestNotificationPermission(true).then(function (permission) {
                if (permission === 'granted') {
                    triggerBbeWarnings(false);
                }
            }).catch(function () {});
        }

        document.addEventListener('pointerup', onFirstGesture, { once: true });
    }

    function showLocalNotification(title, body) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
            navigator.serviceWorker.getRegistration().then(function (registration) {
                if (registration && registration.showNotification) {
                    registration.showNotification(title, {
                        body: body,
                        tag: 'bbe-warning-' + Date.now(),
                        icon: './icon.svg',
                        badge: './icon.svg',
                    });
                } else {
                    new Notification(title, { body: body, icon: './icon.svg' });
                }
            }).catch(function () {
                new Notification(title, { body: body, icon: './icon.svg' });
            });
            return;
        }

        new Notification(title, { body: body, icon: './icon.svg' });
    }

    function cleanBbeNotifiedMap() {
        var alive = {};
        Object.keys(state.lists).forEach(function (locationKey) {
            (state.lists[locationKey] || []).forEach(function (item) {
                if (item && item.id) {
                    alive[item.id] = true;
                }
            });
        });

        Object.keys(state.notifiedBbe).forEach(function (id) {
            if (!alive[id]) {
                delete state.notifiedBbe[id];
            }
        });
    }

    function triggerBbeWarnings(allowPrompt) {
        var soon = getSoonExpiringItems();
        if (!soon.length) return;

        requestNotificationPermission(allowPrompt).then(function (permission) {
            if (permission !== 'granted') return;

            soon.forEach(function (entry) {
                var item = entry.item;
                var locationLabel = LOCATIONS[entry.locationKey] ? LOCATIONS[entry.locationKey].label : entry.locationKey;
                var whenText = entry.days === 0 ? 'today' : ('in ' + entry.days + ' day' + (entry.days === 1 ? '' : 's'));

                showLocalNotification(
                    'BBE warning: ' + item.name,
                    item.name + ' in ' + locationLabel + ' expires ' + whenText + ' (' + formatBbeDate(item.bbeDate) + ').'
                );

                state.notifiedBbe[item.id] = true;
            });

            saveData();
        }).catch(function () {});
    }

    function addItemFromForm() {
        if (!currentLocation) return;

        var name = normalizeItemName(itemNameInput.value, currentLocation);
        var quantity = itemQtyInput.value.trim();
        var weight = itemWeightInput.value.trim();
        var packSize = itemPackInput.value.trim();
        var bbeDate = itemBbeInput.value;

        if (!name || !quantity) return;

        var itemId = currentEditingItemId || genId();
        var newItem = {
            id: itemId,
            name: name,
            quantity: quantity,
            weight: weight,
            packSize: packSize,
            bbeDate: bbeDate,
            icon: normalizeItemIcon(itemNameInput.dataset.selectedIcon, name),
            zoneId: currentHotspot || '',
        };

        rememberSuggestion(newItem.name, newItem.icon);

        if (currentEditingItemId) {
            state.lists[currentLocation] = state.lists[currentLocation].map(function (item) {
                return item.id === currentEditingItemId ? newItem : item;
            });
            if (state.notifiedBbe[itemId]) {
                delete state.notifiedBbe[itemId];
            }
        } else {
            state.lists[currentLocation].unshift(newItem);
        }

        saveData();
        renderList();
        updateHotspotMeta();
        currentEditingItemId = null;
        resetAddItemInputs();
        delete itemNameInput.dataset.selectedIcon;
        hideItemSuggestions();
        addItemBtn.textContent = 'Add item';
        cancelEditBtn.hidden = true;
        removeItemBtn.hidden = true;
        addItemForm.hidden = true;
        toggleAddItemBtn.textContent = '+';

        if (newItem.bbeDate) {
            triggerBbeWarnings(true);
        }
    }

    function renderList() {
        listContainer.innerHTML = '';
        var items = (state.lists[currentLocation] || []).filter(function (item) {
            return itemBelongsToHotspot(item, currentHotspot);
        });
        emptyListMsg.hidden = items.length > 0;
        items.forEach(function (item) {
            listContainer.appendChild(createItemEl(item, currentLocation));
        });
    }

    function createItemEl(item, locationId) {
        var el = document.createElement('div');
        el.className = 'list-item is-collapsed';

        var iconBtnEl = document.createElement('button');
        iconBtnEl.type = 'button';
        iconBtnEl.className = 'list-item-icon-btn';
        iconBtnEl.setAttribute('aria-label', 'Change icon for ' + normalizeItemName(item.name, locationId));

        var iconEl = document.createElement('span');
        iconEl.className = 'list-item-icon';
        var displayName = normalizeItemName(item.name, locationId);
        iconEl.textContent = normalizeItemIcon(item.icon, displayName || item.name);
        iconEl.setAttribute('aria-hidden', 'true');
        iconBtnEl.appendChild(iconEl);
        iconBtnEl.addEventListener('click', function (e) {
            e.stopPropagation();
            openIconPicker(item.id);
        });

        var textEl = document.createElement('div');
        textEl.className = 'list-item-text';

        var nameEl = document.createElement('div');
        nameEl.className = 'list-item-name';
        nameEl.textContent = displayName || item.name;
        textEl.appendChild(nameEl);

        var metaParts = [];
        if (item.quantity) {
            metaParts.push('Qty: ' + item.quantity);
        }
        if (item.weight) {
            metaParts.push('Weight: ' + item.weight);
        }
        if (item.packSize) {
            metaParts.push('Pack: ' + item.packSize);
        }
        if (item.bbeDate) {
            metaParts.push('BBE: ' + formatBbeDate(item.bbeDate));
        }

        if (metaParts.length) {
            var qtyEl = document.createElement('div');
            qtyEl.className = 'list-item-qty';
            qtyEl.textContent = metaParts.join(' • ');
            textEl.appendChild(qtyEl);
        }

        textEl.addEventListener('click', function () {
            if (!metaParts.length) return;
            el.classList.toggle('is-collapsed');
        });

        var actionsEl = document.createElement('div');
        actionsEl.className = 'list-item-actions';

        var editBtnEl = document.createElement('button');
        editBtnEl.type = 'button';
        editBtnEl.className = 'list-item-action-btn edit';
        editBtnEl.textContent = 'Edit';
        editBtnEl.setAttribute('aria-label', 'Edit ' + (displayName || item.name));

        (function (id) {
            editBtnEl.addEventListener('click', function () { startEditItem(id); });
        }(item.id));

        var mergeBtnEl = document.createElement('button');
        mergeBtnEl.type = 'button';
        mergeBtnEl.className = 'list-item-action-btn merge';
        mergeBtnEl.textContent = 'Merge';
        mergeBtnEl.setAttribute('aria-label', 'Merge ' + (displayName || item.name));

        (function (id) {
            mergeBtnEl.addEventListener('click', function () { openMergeModal(id); });
        }(item.id));

        el.appendChild(iconBtnEl);
        el.appendChild(textEl);
        actionsEl.appendChild(editBtnEl);
        actionsEl.appendChild(mergeBtnEl);
        el.appendChild(actionsEl);
        return el;
    }

    function openIconPicker(itemId) {
        if (!currentLocation) return;
        var items = state.lists[currentLocation] || [];
        var item = items.find(function (entry) { return entry.id === itemId; });
        if (!item) return;

        currentIconItemId = itemId;
        var displayName = normalizeItemName(item.name, currentLocation);
        var selectedIcon = item.icon || '';
        var currentIcon = normalizeItemIcon(item.icon, displayName || item.name);

        iconPickerCurrentIcon.textContent = currentIcon;
        iconPickerCurrentName.textContent = displayName || item.name;

        renderIconPickerChoices(itemId, displayName || item.name, selectedIcon);
        iconPickerModal.hidden = false;
    }

    function renderIconPickerChoices(itemId, itemName, selectedIcon) {
        iconPickerGrid.innerHTML = '';
        getIconChoices().forEach(function (choice) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'icon-picker-btn' + (choice.className ? (' ' + choice.className) : '');
            if (selectedIcon === choice.value || (!selectedIcon && choice.value === '')) {
                btn.classList.add('is-selected');
            }
            btn.textContent = choice.label;
            btn.addEventListener('click', function () {
                updateItemIcon(itemId, choice.value, itemName);
                closeIconPicker();
            });
            iconPickerGrid.appendChild(btn);
        });
    }

    function closeIconPicker() {
        currentIconItemId = null;
        iconPickerModal.hidden = true;
        iconPickerGrid.innerHTML = '';
    }

    function openUseItemModal() {
        if (!currentLocation) return;
        var items = (state.lists[currentLocation] || []).filter(function (item) {
            return itemBelongsToHotspot(item, currentHotspot);
        });
        useItemSelect.innerHTML = '<option value="">Choose an item...</option>';

        if (!items.length) {
            useItemSelect.innerHTML = '<option value="">No items in this zone</option>';
            useItemSelect.disabled = true;
            return;
        }

        useItemSelect.disabled = false;
        items.forEach(function (item) {
            var option = document.createElement('option');
            option.value = item.id;
            var parts = [normalizeItemName(item.name, currentLocation) || item.name];
            if (item.quantity) {
                parts.push('Qty ' + item.quantity);
            }
            if (item.weight) {
                parts.push(item.weight);
            }
            option.textContent = parts.join(' • ');
            useItemSelect.appendChild(option);
        });

        useQtyInput.value = '';
        useWeightInput.value = '';
        useItemModal.hidden = false;
    }

    function closeUseItemModal() {
        useItemModal.hidden = true;
        useItemSelect.innerHTML = '<option value="">Choose an item...</option>';
        useQtyInput.value = '';
        useWeightInput.value = '';
    }

    function applyUse() {
        if (!currentLocation) return;
        var itemId = useItemSelect.value;
        if (!itemId) {
            window.alert('Please select an item');
            return;
        }

        var qtyToUse = useQtyInput.value ? parseFloat(useQtyInput.value) : 0;
        var weightToUse = useWeightInput.value;

        if (!qtyToUse && !weightToUse) {
            window.alert('Please select use quantity or weight');
            return;
        }

        var items = state.lists[currentLocation] || [];
        var item = items.find(function (entry) { return entry.id === itemId; });
        if (!item) return;

        var nextQuantity = item.quantity || '';
        var nextWeight = item.weight || '';

        if (qtyToUse) {
            var currentQty = parseFloat(item.quantity || '0');
            if (!isNaN(currentQty)) {
                var remainingQty = Math.max(0, currentQty - qtyToUse);
                nextQuantity = remainingQty ? String(remainingQty) : '0';
            }
        }

        if (weightToUse && item.weight) {
            var currentMeasure = parseMeasure(item.weight);
            var removedMeasure = parseMeasure(weightToUse);
            if (currentMeasure && removedMeasure && currentMeasure.kind === removedMeasure.kind) {
                var remainingBase = Math.max(0, currentMeasure.base - removedMeasure.base);
                nextWeight = remainingBase > 0
                    ? formatMeasure({ kind: currentMeasure.kind, base: remainingBase }, currentMeasure)
                    : '';
            }
        }

        var quantityEmpty = !nextQuantity || nextQuantity === '0';
        var weightEmpty = !nextWeight;

        var shouldRemoveItem = false;
        if (weightToUse && weightEmpty && item.weight) {
            shouldRemoveItem = true;
        } else if (qtyToUse && quantityEmpty && !weightToUse) {
            shouldRemoveItem = true;
        } else if (qtyToUse && weightToUse && quantityEmpty && weightEmpty) {
            shouldRemoveItem = true;
        }

        if (shouldRemoveItem) {
            state.lists[currentLocation] = state.lists[currentLocation].filter(function (entry) {
                return entry.id !== itemId;
            });
            if (state.notifiedBbe[itemId]) {
                delete state.notifiedBbe[itemId];
            }
            cleanBbeNotifiedMap();
        } else {
            item.quantity = nextQuantity;
            item.weight = nextWeight;
        }

        saveData();
        renderList();
        updateHotspotMeta();
        closeUseItemModal();
    }

    function openMergeModal(itemId) {
        if (!currentLocation || !currentHotspot) return;
        var items = state.lists[currentLocation] || [];
        var sourceItem = items.find(function (entry) { return entry.id === itemId; });
        if (!sourceItem) return;

        mergeSourceItemId = itemId;
        mergeSourceName.textContent = sourceItem.name;
        mergeTargetSelect.innerHTML = '<option value="">Choose an item…</option>';

        items.forEach(function (item) {
            if (item.id === itemId || !itemBelongsToHotspot(item, currentHotspot)) return;
            var opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item.icon + ' ' + item.name;
            mergeTargetSelect.appendChild(opt);
        });

        mergePreview.hidden = true;
        mergeModal.hidden = false;
    }

    function closeMergeModal() {
        mergeModal.hidden = true;
        mergeSourceItemId = null;
        mergeTargetSelect.innerHTML = '<option value="">Choose an item…</option>';
        mergePreview.hidden = true;
    }

    function updateMergePreview() {
        if (!mergeTargetSelect.value) {
            mergePreview.hidden = true;
            return;
        }

        var items = state.lists[currentLocation] || [];
        var sourceItem = items.find(function (entry) { return entry.id === mergeSourceItemId; });
        var targetItem = items.find(function (entry) { return entry.id === mergeTargetSelect.value; });
        if (!sourceItem || !targetItem) return;

        // Merge quantities (add them)
        var mergedQty = '';
        if (sourceItem.quantity && targetItem.quantity) {
            var s = parseFloat(sourceItem.quantity) || 0;
            var t = parseFloat(targetItem.quantity) || 0;
            mergedQty = (s + t).toString();
        } else if (sourceItem.quantity) {
            mergedQty = sourceItem.quantity;
        } else if (targetItem.quantity) {
            mergedQty = targetItem.quantity;
        }

        // Merge weights (add them)
        var mergedWeight = '';
        if (sourceItem.weight && targetItem.weight) {
            var sw = parseMeasure(sourceItem.weight);
            var tw = parseMeasure(targetItem.weight);
            if (sw && tw && sw.unit === tw.unit) {
                mergedWeight = (sw.amount + tw.amount) + sw.unit;
            } else {
                mergedWeight = sourceItem.weight + ' + ' + targetItem.weight;
            }
        } else if (sourceItem.weight) {
            mergedWeight = sourceItem.weight;
        } else if (targetItem.weight) {
            mergedWeight = targetItem.weight;
        }

        var metaParts = [];
        if (mergedQty) metaParts.push('Qty: ' + mergedQty);
        if (mergedWeight) metaParts.push('Wt: ' + mergedWeight);
        if (sourceItem.packSize) metaParts.push('Pack: ' + sourceItem.packSize);
        if (sourceItem.bbeDate) metaParts.push('BBE: ' + formatBbeDate(sourceItem.bbeDate));

        mergePreviewIcon.textContent = targetItem.icon;
        mergePreviewName.textContent = targetItem.name;
        mergePreviewMeta.textContent = metaParts.join(' • ') || '(no data)';
        mergePreview.hidden = false;
    }

    function performMerge() {
        if (!mergeSourceItemId || !mergeTargetSelect.value) return;
        var items = state.lists[currentLocation] || [];
        var sourceItem = items.find(function (entry) { return entry.id === mergeSourceItemId; });
        var targetItem = items.find(function (entry) { return entry.id === mergeTargetSelect.value; });
        if (!sourceItem || !targetItem) return;

        // Merge quantities
        if (sourceItem.quantity && targetItem.quantity) {
            var s = parseFloat(sourceItem.quantity) || 0;
            var t = parseFloat(targetItem.quantity) || 0;
            targetItem.quantity = (s + t).toString();
        } else if (sourceItem.quantity && !targetItem.quantity) {
            targetItem.quantity = sourceItem.quantity;
        }

        // Merge weights
        if (sourceItem.weight && targetItem.weight) {
            var sw = parseMeasure(sourceItem.weight);
            var tw = parseMeasure(targetItem.weight);
            if (sw && tw && sw.unit === tw.unit) {
                targetItem.weight = (sw.amount + tw.amount) + sw.unit;
            }
        } else if (sourceItem.weight && !targetItem.weight) {
            targetItem.weight = sourceItem.weight;
        }

        // Use target's BBE unless it doesn't have one
        if (sourceItem.bbeDate && !targetItem.bbeDate) {
            targetItem.bbeDate = sourceItem.bbeDate;
        }

        // Remove source item
        var idx = items.indexOf(sourceItem);
        if (idx !== -1) items.splice(idx, 1);

        saveData();
        renderList();
        updateHotspotMeta();
        closeMergeModal();
    }

    function parseMeasure(value) {
        var text = String(value || '').trim().toLowerCase();
        if (!text) return null;

        var match = text.match(/^([0-9]+(?:\.[0-9]+)?)\s*(kg|g|ml|l|litre|litres|pint|pints)$/);
        if (!match) return null;

        var amount = parseFloat(match[1]);
        var unit = match[2];
        if (isNaN(amount)) return null;

        if (unit === 'kg') return { kind: 'mass', base: amount * 1000 };
        if (unit === 'g') return { kind: 'mass', base: amount };
        if (unit === 'l' || unit === 'litre' || unit === 'litres') return { kind: 'volume', base: amount * 1000 };
        if (unit === 'ml') return { kind: 'volume', base: amount };
        if (unit === 'pint' || unit === 'pints') return { kind: 'volume', base: amount * 568, preferred: 'pints' };
        return null;
    }

    function formatMeasure(parsed, preferredSource) {
        if (!parsed || parsed.base <= 0) return '';

        var preferred = preferredSource && preferredSource.preferred ? preferredSource.preferred : '';

        if (parsed.kind === 'mass') {
            if (parsed.base >= 1000 && parsed.base % 1000 === 0) {
                return (parsed.base / 1000) + 'kg';
            }
            return parsed.base + 'g';
        }

        if (preferred === 'pints' && parsed.base % 568 === 0) {
            var pints = parsed.base / 568;
            return pints + ' ' + (pints === 1 ? 'pint' : 'pints');
        }

        if (parsed.base >= 1000 && parsed.base % 1000 === 0) {
            return (parsed.base / 1000) + 'L';
        }

        return parsed.base + 'ml';
    }

    function updateItemIcon(itemId, iconValue, itemName) {
        if (!currentLocation) return;
        state.lists[currentLocation] = (state.lists[currentLocation] || []).map(function (item) {
            if (item.id !== itemId) return item;
            return Object.assign({}, item, {
                icon: iconValue || ''
            });
        });

        if (currentEditingItemId === itemId) {
            if (iconValue) {
                itemNameInput.dataset.selectedIcon = iconValue;
            } else {
                delete itemNameInput.dataset.selectedIcon;
            }
        }

        rememberSuggestion(itemName, iconValue);

        saveData();
        renderList();
        updateHotspotMeta();
    }

    function startEditItem(id) {
        var items = state.lists[currentLocation] || [];
        var item = items.find(function (entry) { return entry.id === id; });
        if (!item) return;

        currentEditingItemId = id;
        addItemForm.hidden = false;
        toggleAddItemBtn.textContent = '\u2212';
        addItemBtn.textContent = 'Save changes';
        cancelEditBtn.hidden = false;
        removeItemBtn.hidden = false;
        moveItemBtn.hidden = false;
        itemNameInput.value = normalizeItemName(item.name, currentLocation);
        itemNameInput.dataset.selectedIcon = normalizeItemIcon(item.icon, itemNameInput.value || item.name || '');
        setSelectValue(itemQtyInput, item.quantity || '');
        setSelectValue(itemWeightInput, item.weight || '');
        setSelectValue(itemPackInput, item.packSize || '');
        itemBbeInput.value = item.bbeDate || '';
        renderItemSuggestions(itemNameInput.value);
    }

    function deleteItem(id) {
        var items = state.lists[currentLocation] || [];
        var item = items.find(function (entry) { return entry.id === id; });
        var areaName = currentHotspot
            ? (state.names[currentHotspot] || DEFAULT_NAMES[currentHotspot] || 'this area')
            : 'this area';
        if (item && !window.confirm('Remove ' + item.name + ' from the ' + areaName.toLowerCase() + '?')) {
            return;
        }

        state.lists[currentLocation] = state.lists[currentLocation].filter(function (i) {
            return i.id !== id;
        });
        if (state.notifiedBbe[id]) {
            delete state.notifiedBbe[id];
        }
        if (currentEditingItemId === id) {
            resetItemFormState();
        }
        cleanBbeNotifiedMap();
        saveData();
        renderList();
        updateHotspotMeta();
    }

    function moveItem(id, targetHotspot) {
        if (!currentLocation || !currentHotspot || !targetHotspot) return;

        var targetLocation = getAssignedList(targetHotspot);
        if (currentLocation === targetLocation && currentHotspot === targetHotspot) return;

        var items = state.lists[currentLocation] || [];
        var item = items.find(function (entry) { return entry.id === id; });
        if (!item) return;

        // Remove from current location
        state.lists[currentLocation] = state.lists[currentLocation].filter(function (i) {
            return i.id !== id;
        });

        // Add to target location
        if (!state.lists[targetLocation]) {
            state.lists[targetLocation] = [];
        }
        state.lists[targetLocation].unshift(Object.assign({}, item, {
            zoneId: targetHotspot
        }));

        if (currentEditingItemId === id) {
            resetItemFormState();
            currentLocation = targetLocation;
            currentHotspot = targetHotspot;
            subsectionTitle.textContent = state.names[targetHotspot] || DEFAULT_NAMES[targetHotspot] || LOCATIONS[targetLocation].label;
            saveData();
            renderList();
            updateHotspotMeta();
        } else {
            saveData();
            renderList();
            updateHotspotMeta();
        }
    }

    function openMoveItemModal() {
        if (!currentEditingItemId) return;
        moveItemZones.innerHTML = '';
        Object.keys(state.positions).forEach(function (hotspotId) {
            if (hotspotId === currentHotspot) return;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'move-zone-btn';
            btn.textContent = state.names[hotspotId] || DEFAULT_NAMES[hotspotId] || 'Zone';
            btn.addEventListener('click', function () {
                moveItem(currentEditingItemId, hotspotId);
                moveItemModal.hidden = true;
                hideItemSuggestions();
            });
            moveItemZones.appendChild(btn);
        });
        moveItemModal.hidden = false;
    }

    function closeMoveItemModal() {
        moveItemModal.hidden = true;
    }

    subsectionClose.addEventListener('click', function () {
        subsectionPanel.hidden = true;
        resetItemFormState();
        currentLocation = null;
        currentHotspot = null;
    });

    toggleAddItemBtn.addEventListener('click', function () {
        if (isReadOnly) {
            window.alert('Child accounts are read-only.');
            return;
        }
        var willOpen = addItemForm.hidden;
        addItemForm.hidden = !addItemForm.hidden;
        toggleAddItemBtn.textContent = willOpen ? '\u2212' : '+';
        if (!willOpen) {
            currentEditingItemId = null;
            addItemBtn.textContent = 'Add item';
            cancelEditBtn.hidden = true;
            removeItemBtn.hidden = true;
            moveItemBtn.hidden = true;
            resetAddItemInputs();
            delete itemNameInput.dataset.selectedIcon;
            hideItemSuggestions();
        }
    });

    itemNameInput.addEventListener('input', function () {
        delete itemNameInput.dataset.selectedIcon;
        renderItemSuggestions(itemNameInput.value);
    });

    itemNameInput.addEventListener('focus', function () {
        if (itemNameInput.value.trim()) renderItemSuggestions(itemNameInput.value);
    });

    itemNameInput.addEventListener('click', function () {
        if (itemNameInput.value.trim()) renderItemSuggestions(itemNameInput.value);
    });

    itemNameInput.addEventListener('blur', function () {
        setTimeout(function () {
            hideItemSuggestions();
        }, 120);
    });

    cancelEditBtn.addEventListener('click', function () {
        resetItemFormState();
    });

    removeItemBtn.addEventListener('click', function () {
        if (isReadOnly) {
            window.alert('Child accounts are read-only.');
            return;
        }
        if (!currentEditingItemId) return;
        deleteItem(currentEditingItemId);
    });

    moveItemBtn.addEventListener('click', function () {
        if (isReadOnly) {
            window.alert('Child accounts are read-only.');
            return;
        }
        openMoveItemModal();
    });

    moveItemCancel.addEventListener('click', function () {
        closeMoveItemModal();
    });

    moveItemModal.addEventListener('click', function (e) {
        if (e.target === moveItemModal || e.target === moveItemModal.querySelector('.modal-backdrop')) {
            closeMoveItemModal();
        }
    });

    cloudSyncCancelBtn.addEventListener('click', function () {
        closeCloudSyncModal();
    });

    cloudSyncModal.addEventListener('click', function (e) {
        if (e.target === cloudSyncModal || e.target === cloudSyncModal.querySelector('.modal-backdrop')) {
            closeCloudSyncModal();
        }
    });

    cloudHouseCodeInput.addEventListener('input', function () {
        var clean = sanitizeHouseCode(cloudHouseCodeInput.value);
        if (cloudHouseCodeInput.value !== clean) {
            cloudHouseCodeInput.value = clean;
        }
        state.cloud.houseCode = clean;
        updateCloudSyncUi();
    });

    cloudCreateHouseBtn.addEventListener('click', function () {
        createSharedHouse();
    });

    cloudSyncNowBtn.addEventListener('click', function () {
        syncSharedHouseNow();
    });

    if (cloudShareInviteBtn) {
        cloudShareInviteBtn.addEventListener('click', function () {
            shareHouseInvite();
        });
    }

    if (cloudShowQrBtn) {
        cloudShowQrBtn.addEventListener('click', function () {
            showHouseInviteQr();
        });
    }

    if (cloudHideQrBtn) {
        cloudHideQrBtn.addEventListener('click', function () {
            hideInvitePanel();
        });
    }

    cloudLeaveHouseBtn.addEventListener('click', function () {
        leaveSharedHouse();
    });

    iconPickerCancel.addEventListener('click', function () {
        closeIconPicker();
    });

    iconPickerModal.addEventListener('click', function (e) {
        if (e.target === iconPickerModal || e.target === iconPickerModal.querySelector('.modal-backdrop')) {
            closeIconPicker();
        }
    });

    useItemHeaderBtn.addEventListener('click', function () {
        openUseItemModal();
    });

    useItemCancel.addEventListener('click', function () {
        closeUseItemModal();
    });

    useItemModal.addEventListener('click', function (e) {
        if (e.target === useItemModal || e.target === useItemModal.querySelector('.modal-backdrop')) {
            closeUseItemModal();
        }
    });

    applyUseBtn.addEventListener('click', function () {
        if (isReadOnly) {
            window.alert('Child accounts are read-only.');
            return;
        }
        applyUse();
    });

    mergeModal.addEventListener('click', function (e) {
        if (e.target === mergeModal || e.target === mergeModal.querySelector('.modal-backdrop')) {
            closeMergeModal();
        }
    });

    mergeTargetSelect.addEventListener('change', function () {
        updateMergePreview();
    });

    mergeConfirmBtn.addEventListener('click', function () {
        if (isReadOnly) {
            window.alert('Child accounts are read-only.');
            return;
        }
        performMerge();
    });

    mergeCancelBtn.addEventListener('click', function () {
        closeMergeModal();
    });

    subsectionTitle.addEventListener('click', function () {
        if (!currentHotspot) return;
        renameZone(currentHotspot, 'Rename this appliance/area:');
    });

    addItemBtn.addEventListener('click', function () {
        if (isReadOnly) {
            window.alert('Child accounts are read-only.');
            return;
        }
        addItemFromForm();
    });

    function applyPositions() {
        getHotspotButtons().forEach(function (button) {
            var id = button.dataset.hotspot;
            ensureZoneState(id);
            var pos = state.positions[id];
            if (!pos) return;

            button.style.left = pos.left + '%';
            button.style.top = pos.top + '%';
            button.style.width = pos.width + '%';
            button.style.height = pos.height + '%';
            button.style.transform = 'rotate(' + normalizeDeg(state.rotations[id] || 0) + 'deg)';
            button.dataset.name = state.names[id] || DEFAULT_NAMES[id] || button.dataset.name || 'Zone';
        });
    }

    function ensureHandles(button) {
        if (!button.querySelector('.hotspot-meta')) {
            var meta = document.createElement('span');
            meta.className = 'hotspot-meta';
            meta.id = 'meta-' + button.dataset.hotspot;
            button.appendChild(meta);
        }

        if (!button.querySelector('.resize-handle')) {
            var resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            resizeHandle.setAttribute('aria-hidden', 'true');
            button.appendChild(resizeHandle);
        }

        if (!button.querySelector('.rotate-handle')) {
            var rotateHandle = document.createElement('div');
            rotateHandle.className = 'rotate-handle';
            rotateHandle.setAttribute('aria-hidden', 'true');
            button.appendChild(rotateHandle);
        }
    }

    function createZoneElement(hotspotId) {
        if (kitchenStage.querySelector('[data-hotspot="' + hotspotId + '"]')) return;

        var button = document.createElement('button');
        button.className = 'kitchen-hotspot';
        button.type = 'button';
        button.dataset.hotspot = hotspotId;
        button.dataset.name = state.names[hotspotId] || 'Zone';
        button.setAttribute('aria-label', button.dataset.name + ' area');

        kitchenStage.appendChild(button);
        ensureHandles(button);
        bindHotspotInteractions(button);
    }

    function bindHotspotInteractions(button) {
        if (button.dataset.bound === '1') return;
        button.dataset.bound = '1';

        ensureHandles(button);

        var drag = null;
        var moved = false;

        function isNearResizeCorner(e) {
            var rect = button.getBoundingClientRect();
            var threshold = Math.max(30, Math.min(48, Math.min(rect.width, rect.height) * 0.35));
            var nearRight = e.clientX >= (rect.right - threshold);
            var nearBottom = e.clientY >= (rect.bottom - threshold);
            return nearRight && nearBottom;
        }

        function beginDrag(e, mode) {
            if (!editMode) return;
            var id = button.dataset.hotspot;
            var pos = state.positions[id];
            if (!pos) return;

            moved = false;
            drag = {
                mode: mode,
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                startLeft: pos.left,
                startTop: pos.top,
                startWidth: pos.width,
                startHeight: pos.height,
            };

            button.setPointerCapture(e.pointerId);
            e.preventDefault();
        }

        function continueDrag(e) {
            if (!drag || drag.pointerId !== e.pointerId) return;

            moved = true;
            var id = button.dataset.hotspot;
            var pos = state.positions[id];
            var rect = kitchenStage.getBoundingClientRect();
            if (!pos || !rect.width || !rect.height) return;

            var dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
            var dyPct = ((e.clientY - drag.startY) / rect.height) * 100;

            if (drag.mode === 'move') {
                pos.left = clamp(drag.startLeft + dxPct, 0, 100 - pos.width);
                pos.top = clamp(drag.startTop + dyPct, 0, 100 - pos.height);
            }

            if (drag.mode === 'resize') {
                var maxWidth = 100 - pos.left;
                var maxHeight = 100 - pos.top;
                pos.width = clamp(drag.startWidth + dxPct, 8, maxWidth);
                pos.height = clamp(drag.startHeight + dyPct, 8, maxHeight);
            }

            if (drag.mode === 'rotate') {
                var centerX = rect.left + ((pos.left + pos.width / 2) / 100) * rect.width;
                var centerY = rect.top + ((pos.top + pos.height / 2) / 100) * rect.height;
                var angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
                state.rotations[id] = normalizeDeg(angle);
            }

            button.style.left = pos.left + '%';
            button.style.top = pos.top + '%';
            button.style.width = pos.width + '%';
            button.style.height = pos.height + '%';
            button.style.transform = 'rotate(' + normalizeDeg(state.rotations[id] || 0) + 'deg)';

            e.preventDefault();
        }

        function endDrag(e) {
            if (!drag || drag.pointerId !== e.pointerId) return;
            drag = null;
            if (moved) saveData();
            button.releasePointerCapture(e.pointerId);
            e.preventDefault();
        }

        button.addEventListener('click', function (e) {
            if (editMode || moved) {
                e.preventDefault();
                moved = false;
                return;
            }
            var hotspotId = button.dataset.hotspot;
            showList(hotspotId, getAssignedList(hotspotId));
        });

        button.addEventListener('pointerdown', function (e) {
            if (!editMode) return;
            if (e.target.classList.contains('resize-handle') || e.target.classList.contains('rotate-handle')) return;
            beginDrag(e, isNearResizeCorner(e) ? 'resize' : 'move');
        });
        button.addEventListener('pointermove', continueDrag);
        button.addEventListener('pointerup', endDrag);
        button.addEventListener('pointercancel', endDrag);

        var resizeHandle = button.querySelector('.resize-handle');
        var rotateHandle = button.querySelector('.rotate-handle');

        resizeHandle.addEventListener('pointerdown', function (e) {
            beginDrag(e, 'resize');
        });
        resizeHandle.addEventListener('pointermove', continueDrag);
        resizeHandle.addEventListener('pointerup', endDrag);
        resizeHandle.addEventListener('pointercancel', endDrag);

        rotateHandle.addEventListener('pointerdown', function (e) {
            beginDrag(e, 'rotate');
        });
        rotateHandle.addEventListener('pointermove', continueDrag);
        rotateHandle.addEventListener('pointerup', endDrag);
        rotateHandle.addEventListener('pointercancel', endDrag);
    }

    function ensureZoneElements() {
        getHotspotButtons().forEach(function (button) {
            var id = button.dataset.hotspot;
            ensureZoneState(id);
            ensureHandles(button);
            bindHotspotInteractions(button);
        });

        zoneIds().forEach(function (id) {
            createZoneElement(id);
        });
    }

    function addZone() {
        var hotspotId = 'zone-' + Date.now().toString(36);
        state.positions[hotspotId] = { left: 34, top: 34, width: 24, height: 18 };
        state.rotations[hotspotId] = 0;
        state.assignments[hotspotId] = 'cupboard';
        state.names[hotspotId] = 'New zone';

        createZoneElement(hotspotId);
        applyNameToHotspot(hotspotId);
        applyPositions();
        updateHotspotMeta();
        saveData();

        var nextName = window.prompt('Name this new zone:', state.names[hotspotId]);
        if (nextName !== null && nextName.trim()) {
            state.names[hotspotId] = nextName.trim();
            applyNameToHotspot(hotspotId);
            saveData();
        }

        populateRenameZoneSelector();
        populateDeleteZoneSelector();
        enterEditMode();
    }

    function deleteZone() {
        if (!optionsDeleteZoneSelect) return;

        var hotspotId = optionsDeleteZoneSelect.value;
        if (!hotspotId || isDefaultZone(hotspotId)) return;

        var zoneName = getZoneDisplayName(hotspotId);
        var locationId = getAssignedList(hotspotId);
        var fallbackZoneId = zoneIds().find(function (candidateId) {
            return candidateId !== hotspotId && getAssignedList(candidateId) === locationId;
        }) || '';
        var items = state.lists[locationId] || [];
        var movedCount = items.filter(function (item) {
            return item && item.zoneId === hotspotId;
        }).length;

        if (movedCount && !fallbackZoneId) {
            window.alert('This zone still has items and there is no other ' + LOCATIONS[locationId].label.toLowerCase() + ' zone to move them into yet. Add another zone or move the items first.');
            return;
        }

        var message = 'Delete zone "' + zoneName + '"?';
        if (movedCount && fallbackZoneId) {
            message += ' ' + movedCount + ' item' + (movedCount === 1 ? ' will' : 's will') + ' be moved to "' + getZoneDisplayName(fallbackZoneId) + '".';
        }
        if (!window.confirm(message)) {
            return;
        }

        if (movedCount && fallbackZoneId) {
            state.lists[locationId] = items.map(function (item) {
                if (!item || item.zoneId !== hotspotId) return item;
                return Object.assign({}, item, { zoneId: fallbackZoneId });
            });
        }

        delete state.positions[hotspotId];
        delete state.names[hotspotId];
        delete state.assignments[hotspotId];
        delete state.rotations[hotspotId];

        var zoneButton = kitchenStage.querySelector('[data-hotspot="' + hotspotId + '"]');
        if (zoneButton) {
            zoneButton.remove();
        }

        if (currentHotspot === hotspotId) {
            if (fallbackZoneId) {
                showList(fallbackZoneId, getAssignedList(fallbackZoneId));
            } else {
                showHome();
            }
        } else if (!subsectionPanel.hidden && currentHotspot && currentLocation) {
            renderList();
        }

        updateHotspotMeta();
        populateRenameZoneSelector();
        populateDeleteZoneSelector();
        saveData();
    }

    function enterEditMode() {
        editMode = true;
        kitchenStage.classList.add('edit-mode');
        editBtn.classList.add('active');
        editBtn.textContent = 'Done';
        if (layoutBackBtn) {
            layoutBackBtn.hidden = false;
        }
        if (!subsectionPanel.hidden) {
            subsectionPanel.hidden = true;
            resetItemFormState();
            currentLocation = null;
            currentHotspot  = null;
        }
    }

    function exitEditMode() {
        editMode = false;
        kitchenStage.classList.remove('edit-mode');
        editBtn.classList.remove('active');
        editBtn.textContent = '\u22ee';
        if (layoutBackBtn) {
            layoutBackBtn.hidden = true;
        }
    }

    function openOptionsPanel() {
        if (!optionsPanel || !optionsPaneZones || !optionsPaneCloud || !optionsPaneShare || !optionsNavZonesBtn || !optionsNavCloudBtn || !optionsNavShareBtn) {
            enterEditMode();
            return;
        }
        setOptionsSection('zones');
        populateRenameZoneSelector();
        populateDeleteZoneSelector();
        updateCloudSyncUi();
        optionsPanel.hidden = false;
    }

    function closeOptionsPanel() {
        if (!optionsPanel) return;
        optionsPanel.hidden = true;
    }

    function setOptionsSection(section) {
        if (!optionsPaneZones || !optionsPaneCloud || !optionsPaneShare) return;

        var target = section || 'zones';
        optionsPaneZones.hidden = target !== 'zones';
        optionsPaneCloud.hidden = target !== 'cloud';
        optionsPaneShare.hidden = target !== 'share';

        if (optionsNavZonesBtn) optionsNavZonesBtn.classList.toggle('active', target === 'zones');
        if (optionsNavCloudBtn) optionsNavCloudBtn.classList.toggle('active', target === 'cloud');
        if (optionsNavShareBtn) optionsNavShareBtn.classList.toggle('active', target === 'share');
    }

    async function shareAppLink() {
        var shareUrl = String(window.location.href || '').split('#')[0].split('?')[0];
        var shareData = {
            title: document.title || "What's in?",
            text: 'Install and use this app:',
            url: shareUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    return;
                }
            }
        }

        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                window.alert('App link copied.');
                return;
            } catch (error) {
                // Fallback prompt below.
            }
        }

        window.prompt('Copy this app link:', shareUrl);
    }

    editBtn.addEventListener('click', function () {
        if (editMode) {
            exitEditMode();
        } else {
            openOptionsPanel();
        }
    });

    if (layoutBackBtn) {
        layoutBackBtn.addEventListener('click', function () {
            exitEditMode();
            openOptionsPanel();
        });
    }

    if (optionsNavZonesBtn && optionsNavCloudBtn && optionsNavShareBtn) {
        optionsNavZonesBtn.addEventListener('click', function () {
            setOptionsSection('zones');
        });

        optionsNavCloudBtn.addEventListener('click', function () {
            setOptionsSection('cloud');
        });

        optionsNavShareBtn.addEventListener('click', function () {
            setOptionsSection('share');
        });
    }

    if (optionsEditBtn) {
        optionsEditBtn.addEventListener('click', function () {
            if (isReadOnly) {
                window.alert('Child accounts are read-only.');
                return;
            }
            closeOptionsPanel();
            enterEditMode();
        });
    }

    if (optionsAddZoneBtn) {
        optionsAddZoneBtn.addEventListener('click', function () {
            if (isReadOnly) {
                window.alert('Child accounts are read-only.');
                return;
            }
            closeOptionsPanel();
            addZone();
        });
    }

    if (optionsRenameZoneBtn) {
        optionsRenameZoneBtn.addEventListener('click', function () {
            if (isReadOnly) {
                window.alert('Child accounts are read-only.');
                return;
            }
            if (!optionsRenameZoneSelect || !optionsRenameZoneSelect.value) return;
            renameZone(optionsRenameZoneSelect.value, 'Rename this appliance/area:');
        });
    }

    if (optionsDeleteZoneBtn) {
        optionsDeleteZoneBtn.addEventListener('click', function () {
            if (isReadOnly) {
                window.alert('Child accounts are read-only.');
                return;
            }
            deleteZone();
        });
    }

    if (optionsOpenCloudBtn) {
        optionsOpenCloudBtn.addEventListener('click', function () {
            closeOptionsPanel();
            openCloudSyncModal();
        });
    }

    if (optionsShareAppBtn) {
        optionsShareAppBtn.addEventListener('click', function () {
            shareAppLink();
        });
    }

    if (optionsCloseBtn) {
        optionsCloseBtn.addEventListener('click', function () {
            closeOptionsPanel();
        });
    }

    if (optionsPanel) {
        optionsPanel.addEventListener('click', function (e) {
            if (e.target === optionsPanel || e.target === optionsPanel.querySelector('.modal-backdrop')) {
                closeOptionsPanel();
            }
        });
    }

    updateInstallUi();

    window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault();
        deferredInstallPrompt = event;
        updateInstallUi();
    });

    if (installAppBtn) {
        installAppBtn.addEventListener('click', handleInstallRequest);
    }

    window.addEventListener('appinstalled', function () {
        deferredInstallPrompt = null;
        isStandalone = true;
        updateInstallUi();
    });

    // ── Receipt scanner ──────────────────────────────────────────────

    var RECEIPT_NOISE = [
        /^\d[\d\s.,*x\/%-]*$/,                       // pure numbers / prices
        /^[£$€]\s*[\d.,]+$/,                          // currency amounts
        /total|subtotal|sub\s*total|to\s*pay|balance|change|cash|card|visa|mastercard/i,
        /vat|tax|incl|excl|receipt|invoice|thank\s*you|please\s*come\s*again/i,
        /date|time|till|cashier|server|auth|ref|no\.|transaction|loyalty|points/i,
        /tel:|phone:|www\.|http|\.com|\.co\.|store|branch|opening\s*hour/i,
        /^\s*$/,                                       // blank
        /^.{1,2}$/,                                    // 1-2 char fragments
        /\d{4,}/,                                      // long number strings (barcodes etc.)
    ];

    var COMMON_ABBREV = {
        'chkn': 'Chicken', 'chk': 'Chicken', 'mince': 'Minced beef',
        'brd': 'Bread', 'mlk': 'Milk', 'bttr': 'Butter', 'chz': 'Cheese',
        'og': 'Organic', 'fr': 'Fresh', 'frz': 'Frozen',
        'bg': 'Bag', 'pkt': 'Pack', 'btl': 'Bottle', 'tin': 'Tin',
        'whl': 'Whole', 'skm': 'Skimmed', 'sml': 'Small', 'med': 'Medium', 'lrg': 'Large',
    };

    function cleanReceiptLine(raw) {
        if (!raw || typeof raw !== 'string') return '';
        var line = raw
            .replace(/\b\d+\s*@\s*[\d.,]+/g, '')   // "2 @ 1.50"
            .replace(/[\d.,]+\s*[£$€]/g, '')            // price at end
            .replace(/[£$€]\s*[\d.,]+/g, '')            // price at start
            .replace(/\d+\s*for\s*[\d.,]+/gi, '')       // "3 for 2.00"
            .replace(/\*+/g, '')                         // asterisks
            .replace(/\s{2,}/g, ' ')
            .trim()
            // drop trailing digits left over (e.g. "Cheese A 2")
            .replace(/\s+\d+(\.\d+)?$/, '')
            .trim();

        // Expand known abbreviations (whole-word)
        Object.keys(COMMON_ABBREV).forEach(function (abbr) {
            var re = new RegExp('\\b' + abbr + '\\b', 'gi');
            line = line.replace(re, COMMON_ABBREV[abbr]);
        });

        // Title-case
        return line.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
    }

    function isNoiseLine(line) {
        if (!line || typeof line !== 'string') return true;
        return RECEIPT_NOISE.some(function (re) { return re.test(line); });
    }

    function parseReceiptText(rawText) {
        if (!rawText || typeof rawText !== 'string') return [];
        var lines = rawText.split(/\r?\n/);
        var seen = {};
        var results = [];

        lines.forEach(function (raw) {
            var cleaned = cleanReceiptLine(raw);
            if (!cleaned || typeof cleaned !== 'string' || isNoiseLine(cleaned)) return;
            var key = cleaned.toLowerCase();
            if (seen[key]) return;
            seen[key] = true;
            results.push(cleaned);
        });

        console.log('Parsed receipt:', results.length, 'items');
        return results;
    }

    // ---- Scan alias helpers ----

    var SCAN_STOP = { a:1, an:1, the:1, of:1, in:1, and:1, with:1, for:1, to:1, is:1, on:1, per:1 };

    function normalizeForAlias(str) {
        if (!str || typeof str !== 'string') return '';
        return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    }

    function scanTokens(str) {
        if (!str || typeof str !== 'string') return [];
        return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/)
            .filter(function (w) { return w.length > 1 && !SCAN_STOP[w]; });
    }

    function getScanCandidates() {
        var seen = {};
        var result = [];
        function add(name, icon) {
            if (!name || typeof name !== 'string') return;
            var k = name.toLowerCase();
            if (!seen[k]) { seen[k] = true; result.push({ name: name, icon: icon || '📦' }); }
        }
        (state.lists[currentLocation] || [])
            .filter(function (it) { return itemBelongsToHotspot(it, currentHotspot); })
            .forEach(function (it) { if (it && it.name) add(it.name, it.icon); });
        Object.keys(state.suggestionMemory || {}).forEach(function (k) {
            var m = state.suggestionMemory[k];
            if (m && m.name) add(m.name, m.icon);
        });
        BASE_ITEM_SUGGESTIONS.forEach(function (s) { if (s && s.name) add(s.name, s.icon); });
        return result;
    }

    function findSimilarSavedItem(scannedName, candidates) {
        if (!scannedName || typeof scannedName !== 'string') return null;
        var scTok = scanTokens(scannedName);
        if (!scTok.length) return null;
        var best = null, bestScore = 0;
        candidates.forEach(function (c) {
            if (normalizeForAlias(c.name || '') === normalizeForAlias(scannedName)) return;
            var svTok = scanTokens(c.name || '');
            if (!svTok.length) return;
            var hits = svTok.filter(function (sv) {
                return scTok.some(function (sc) {
                    return sc === sv || sc.startsWith(sv) || sv.startsWith(sc);
                });
            }).length;
            var score = hits / svTok.length;
            if (score > bestScore) { bestScore = score; best = c; }
        });
        return bestScore >= 0.5 ? best : null;
    }

    function saveScanAlias(scannedName, savedName, savedIcon) {
        if (!scannedName || !savedName) return;
        var key = normalizeForAlias(scannedName);
        if (!key) return;
        state.scanAliases[key] = { name: savedName, icon: savedIcon };
        saveData();
    }

    function resolveRow(row, name, icon) {
        row.dataset.resolvedName = name;
        row.dataset.resolvedIcon = icon;
        row.querySelector('.scan-item-name').textContent = name;
        row.querySelector('.scan-item-icon').textContent = icon;
    }

    // ---- /Scan alias helpers ----

    function populateScanZoneSelector() {
        if (!scanZoneSelect) return;
        scanZoneSelect.innerHTML = '';
        scanSelectedLocation = null;
        scanSelectedHotspot = null;
        var zones = Object.keys(state.positions).concat(Object.keys(state.assignments || {}))
            .filter(function (id, i, arr) { return arr.indexOf(id) === i; });

        zones.forEach(function (hotspotId) {
            var opt = document.createElement('option');
            opt.value = hotspotId;
            var zoneName = state.names[hotspotId] || DEFAULT_NAMES[hotspotId] || 'Zone';
            opt.textContent = zoneName;
            // Pre-select the current zone if available
            if (hotspotId === currentHotspot) {
                opt.selected = true;
                scanSelectedLocation = currentLocation;
                scanSelectedHotspot = currentHotspot;
            }
            scanZoneSelect.appendChild(opt);
        });

        if (!scanSelectedHotspot && scanZoneSelect.options.length) {
            scanZoneSelect.selectedIndex = 0;
            scanSelectedHotspot = scanZoneSelect.value;
            scanSelectedLocation = getAssignedList(scanSelectedHotspot);
        }
    }

    function openReceiptScanModal() {
        scanProgressSection.hidden = false;
        scanResultsSection.hidden = true;
        scanEmptySection.hidden = true;
        scanDebugSection.hidden = true;
        scanStatusText.textContent = 'Starting OCR engine…';
        scanProgressFill.style.width = '0%';
        scanItemList.innerHTML = '';
        if (scanZoneSelect) scanZoneSelect.innerHTML = '';
        receiptScanModal.hidden = false;
    }

    function closeReceiptScanModal() {
        receiptScanModal.hidden = true;
        receiptFileInput.value = '';
        scanItemList.innerHTML = '';
        if (scanZoneSelect) scanZoneSelect.innerHTML = '';
        scanResultsSection.hidden = true;
        scanEmptySection.hidden = true;
        scanDebugSection.hidden = true;
        scanSelectedLocation = null;
        scanSelectedHotspot = null;
    }

    function showScanProgress(pct, message) {
        scanProgressFill.style.width = Math.round(pct) + '%';
        if (message) scanStatusText.textContent = message;
    }

    function showScanResults(items) {
        populateScanZoneSelector();
        scanProgressSection.hidden = true;
        scanEmptySection.hidden = true;
        scanDebugSection.hidden = true;
        console.log('showScanResults called with', (items || []).length, 'items');
        if (!items || !items.length) {
            scanEmptySection.hidden = false;
            return;
        }

        scanItemList.innerHTML = '';
        var candidates = getScanCandidates();

        items.forEach(function (scannedName) {
            if (!scannedName || typeof scannedName !== 'string') return;
            var aliasKey = normalizeForAlias(scannedName);
            var knownAlias = state.scanAliases[aliasKey];
            var resolvedName = knownAlias ? knownAlias.name : scannedName;
            var resolvedIcon = knownAlias ? knownAlias.icon : inferItemIcon(scannedName);

            // ---- Main row ----
            var row = document.createElement('div');
            row.className = 'scan-item-row';
            row.dataset.scanned = scannedName;
            row.dataset.resolvedName = resolvedName;
            row.dataset.resolvedIcon = resolvedIcon;

            var mainLine = document.createElement('div');
            mainLine.className = 'scan-item-main';

            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'scan-item-check';
            checkbox.checked = true;
            checkbox.addEventListener('click', function (e) { e.stopPropagation(); });

            var iconSpan = document.createElement('span');
            iconSpan.className = 'scan-item-icon';
            iconSpan.textContent = resolvedIcon;

            var nameSpan = document.createElement('span');
            nameSpan.className = 'scan-item-name';
            nameSpan.textContent = resolvedName;

            mainLine.appendChild(checkbox);
            mainLine.appendChild(iconSpan);
            mainLine.appendChild(nameSpan);

            // Known alias: show subtle badge; unknown: show link button
            if (knownAlias) {
                var badge = document.createElement('span');
                badge.className = 'scan-alias-badge';
                badge.title = 'Recognised from previous scan';
                badge.textContent = '→ ' + scannedName;
                mainLine.appendChild(badge);
            } else {
                var linkBtn = document.createElement('button');
                linkBtn.type = 'button';
                linkBtn.className = 'scan-link-btn';
                linkBtn.title = 'Link to a saved item';
                linkBtn.textContent = '🔗';
                mainLine.appendChild(linkBtn);
            }

            // Toggle checkbox on row click (not on button)
            mainLine.addEventListener('click', function (e) {
                if (e.target !== checkbox && !e.target.closest('button')) {
                    checkbox.checked = !checkbox.checked;
                }
            });

            row.appendChild(mainLine);

            // ---- Alias hint (auto-suggest) ----
            var hintEl = null;
            var pickerEl = null;

            if (!knownAlias) {
                var suggestion = findSimilarSavedItem(scannedName, candidates);
                if (suggestion) {
                    hintEl = document.createElement('div');
                    hintEl.className = 'scan-alias-hint';

                    var hintText = document.createElement('span');
                    hintText.textContent = 'Same as "';
                    var hintStrong = document.createElement('strong');
                    hintStrong.textContent = suggestion.name;
                    hintText.appendChild(hintStrong);
                    var hintEnd = document.createTextNode('"?');
                    hintText.appendChild(hintEnd);

                    var yesBtn = document.createElement('button');
                    yesBtn.type = 'button';
                    yesBtn.className = 'scan-alias-yes';
                    yesBtn.textContent = 'Yes';
                    yesBtn.addEventListener('click', function () {
                        saveScanAlias(scannedName, suggestion.name, suggestion.icon);
                        resolveRow(row, suggestion.name, suggestion.icon);
                        hintEl.hidden = true;
                        if (pickerEl) pickerEl.hidden = true;
                        linkBtn.hidden = true;
                    });

                    var noBtn = document.createElement('button');
                    noBtn.type = 'button';
                    noBtn.className = 'scan-alias-no';
                    noBtn.textContent = 'No';
                    noBtn.addEventListener('click', function () { hintEl.hidden = true; });

                    hintEl.appendChild(hintText);
                    hintEl.appendChild(yesBtn);
                    hintEl.appendChild(noBtn);
                    row.appendChild(hintEl);
                }

                // ---- Link picker (manual match) ----
                pickerEl = document.createElement('div');
                pickerEl.className = 'scan-link-picker';
                pickerEl.hidden = true;

                var select = document.createElement('select');
                select.className = 'scan-link-select';
                var defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.textContent = 'Pick a saved item…';
                select.appendChild(defaultOpt);
                candidates.forEach(function (c) {
                    if (normalizeForAlias(c.name) === normalizeForAlias(scannedName)) return;
                    var opt = document.createElement('option');
                    opt.value = c.name;
                    opt.dataset.icon = c.icon;
                    opt.textContent = c.icon + ' ' + c.name;
                    select.appendChild(opt);
                });

                var doneBtn = document.createElement('button');
                doneBtn.type = 'button';
                doneBtn.className = 'scan-link-done';
                doneBtn.title = 'Confirm link';
                doneBtn.textContent = '✓';
                doneBtn.addEventListener('click', function () {
                    var sel = select.options[select.selectedIndex];
                    if (!sel || !sel.value) return;
                    var ic = sel.dataset.icon || inferItemIcon(sel.value);
                    saveScanAlias(scannedName, sel.value, ic);
                    resolveRow(row, sel.value, ic);
                    if (hintEl) hintEl.hidden = true;
                    pickerEl.hidden = true;
                    linkBtn.hidden = true;
                });

                var clearBtn = document.createElement('button');
                clearBtn.type = 'button';
                clearBtn.className = 'scan-link-clear';
                clearBtn.title = 'Cancel';
                clearBtn.textContent = '✕';
                clearBtn.addEventListener('click', function () { pickerEl.hidden = true; });

                pickerEl.appendChild(select);
                pickerEl.appendChild(doneBtn);
                pickerEl.appendChild(clearBtn);
                row.appendChild(pickerEl);

                linkBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    pickerEl.hidden = !pickerEl.hidden;
                });
            }

            scanItemList.appendChild(row);
        });

        scanResultsSection.hidden = false;
    }

    function addScannedItems() {
        if (!scanSelectedLocation || !scanSelectedHotspot) return;
        var rows = scanItemList.querySelectorAll('.scan-item-row');
        var added = 0;

        rows.forEach(function (row) {
            var cb = row.querySelector('.scan-item-check');
            if (!cb || !cb.checked) return;
            var name = (row.dataset.resolvedName || '').trim();
            if (!name) return;
            var icon = row.dataset.resolvedIcon || inferItemIcon(name);
            var newItem = {
                id: genId(),
                name: name,
                quantity: '1',
                weight: '',
                packSize: '',
                bbeDate: '',
                icon: icon,
                zoneId: scanSelectedHotspot,
            };
            state.lists[scanSelectedLocation].unshift(newItem);
            rememberSuggestion(name, icon);
            added++;
        });

        if (added) {
            saveData();
            renderList();
            updateHotspotMeta();
        }

        closeReceiptScanModal();
    }

    function runReceiptScan(file) {
        if (!file) return;
        openReceiptScanModal();

        var workerReady = false;

        // Tesseract.js v5 API
        Tesseract.recognize(file, 'eng', {
            logger: function (m) {
                if (m.status === 'loading tesseract core') {
                    showScanProgress(5, 'Loading OCR engine…');
                } else if (m.status === 'initializing tesseract') {
                    showScanProgress(10, 'Initialising…');
                } else if (m.status === 'loading language traineddata') {
                    showScanProgress(20, 'Loading language data…');
                } else if (m.status === 'initializing api') {
                    showScanProgress(30, 'Preparing…');
                } else if (m.status === 'recognizing text') {
                    var pct = 30 + Math.round((m.progress || 0) * 65);
                    showScanProgress(pct, 'Reading receipt… ' + Math.round((m.progress || 0) * 100) + '%');
                }
            }
        }).then(function (result) {
            showScanProgress(100, 'Done!');
            var rawText = (result && result.data && result.data.text) ? result.data.text : 
                         (result && result.text) ? result.text : '';
            console.log('Raw OCR text:', rawText);
            scanRawText.textContent = rawText || '(no text captured)';
            var items = parseReceiptText(rawText);
            showScanResults(items);
        }).catch(function (err) {
            console.error('Tesseract error', err);
            scanProgressSection.hidden = true;
            scanEmptySection.hidden = false;
            scanStatusText.textContent = 'OCR failed. Try again with a clearer photo.';
            scanRawText.textContent = 'Error: ' + (err.message || String(err));
        });
    }

    scanReceiptBtn.addEventListener('click', function () {
        receiptFileInput.click();
    });

    receiptFileInput.addEventListener('change', function () {
        var file = receiptFileInput.files[0];
        if (file) runReceiptScan(file);
    });

    scanCancelBtn.addEventListener('click', function () {
        closeReceiptScanModal();
    });

    receiptScanModal.addEventListener('click', function (e) {
        if (e.target === receiptScanModal || e.target === receiptScanModal.querySelector('.modal-backdrop')) {
            closeReceiptScanModal();
        }
    });

    scanAddBtn.addEventListener('click', function () {
        addScannedItems();
    });

    scanSelectAllBtn.addEventListener('click', function () {
        var checkboxes = scanItemList.querySelectorAll('.scan-item-check');
        var allChecked = Array.prototype.every.call(checkboxes, function (cb) { return cb.checked; });
        checkboxes.forEach(function (cb) { cb.checked = !allChecked; });
        scanSelectAllBtn.textContent = allChecked ? 'Select all' : 'Deselect all';
    });

    scanZoneSelect.addEventListener('change', function () {
        var selectedHotspotId = scanZoneSelect.value;
        if (selectedHotspotId) {
            scanSelectedHotspot = selectedHotspotId;
            scanSelectedLocation = getAssignedList(selectedHotspotId);
        }
    });

    scanShowRawBtn.addEventListener('click', function () {
        scanEmptySection.hidden = true;
        scanDebugSection.hidden = false;
    });

    scanDebugCloseBtn.addEventListener('click', function () {
        scanDebugSection.hidden = true;
        scanEmptySection.hidden = false;
    });

    // ── End receipt scanner ──────────────────────────────────────────

    loadData();
    cleanBbeNotifiedMap();
    ensureZoneElements();
    applyAllNames();
    applyPositions();
    updateCloudSyncUi();
    saveData({ preserveTimestamp: true, skipSync: true });
    showHome();
    triggerBbeWarnings(false);
    primeNotificationPermissionOnGesture();
    initCloudSync();

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
            triggerBbeWarnings(false);
        }
    });

    window.addEventListener('focus', function () {
        triggerBbeWarnings(false);
    });

    // While app is open, periodically re-check soon-expiring items.
    window.setInterval(function () {
        triggerBbeWarnings(false);
    }, 30 * 60 * 1000);

    window.addEventListener('online', function () {
        if (state.cloud.enabled && state.cloud.houseCode) {
            syncSharedHouseNow();
        }
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
            .then(function (registration) {
                registration.update();
            })
            .catch(function () {});
    }

});
