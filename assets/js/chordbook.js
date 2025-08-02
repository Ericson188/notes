// Storage keys
const SONGS_STORAGE_KEY = 'chordBookSongs';
const COLLECTIONS_STORAGE_KEY = 'chordBookCollections';
const PLAYLIST_STORAGE_KEY = 'chordBookPlaylist';
const CURRENT_SONG_INDEX_KEY = 'chordBookCurrentSongIndex';

// Initialize jsPDF
const { jsPDF } = window.jspdf;

// Load data from localStorage
let chords = loadSongs();
let collections = loadCollections();
let playlist = loadPlaylist();
let currentSongIndex = loadCurrentSongIndex();

// If no chords in storage, initialize with sample data
if (chords.length === 0) {
    chords = [
        { id: 1, title: "", lyrics: ""},
        { id: 2, title: "", lyrics: ""},
        { id: 3, title: "", lyrics: ""}
    ];
    saveSongs();
}

// Initialize collections if empty
if (collections.length === 0) {
    collections = [
        { id: 1, name: "Favorites", songIds: [1, 3] },
        { id: 2, name: "Practice List", songIds: [2] }
    ];
    saveCollections();
}

let currentPage = 1;
const itemsPerPage = 5;
let currentViewingId = null;
let currentCollectionId = null;

// DOM elements
const chordListEl = document.getElementById('chordList');
const paginationEl = document.getElementById('pagination');
const searchBarEl = document.getElementById('searchBar');
const titleInput = document.getElementById('title');
const lyricsInput = document.getElementById('lyrics');
const editIdInput = document.getElementById('editId');
const exportOptionsEl = document.getElementById('exportOptions');
const collectionsContainerEl = document.getElementById('collectionsContainer');
const collectionListEl = document.getElementById('collectionList');
const newCollectionFormEl = document.getElementById('newCollectionForm');
const playlistContainerEl = document.getElementById('playlistContainer');
const playlistItemsEl = document.getElementById('playlistItems');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    showAllSongs();
    renderPlaylist();
});

// Data loading functions
function loadSongs() {
    const storedSongs = localStorage.getItem(SONGS_STORAGE_KEY);
    return storedSongs ? JSON.parse(storedSongs) : [];
}

function loadCollections() {
    const storedCollections = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
    return storedCollections ? JSON.parse(storedCollections) : [];
}

function loadPlaylist() {
    const storedPlaylist = localStorage.getItem(PLAYLIST_STORAGE_KEY);
    return storedPlaylist ? JSON.parse(storedPlaylist) : [];
}

function loadCurrentSongIndex() {
    const storedIndex = localStorage.getItem(CURRENT_SONG_INDEX_KEY);
    return storedIndex !== null ? parseInt(storedIndex) : -1;
}

// Data saving functions
function saveSongs() {
    localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(chords));
}

function saveCollections() {
    localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
}

function savePlaylist() {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlist));
}

function saveCurrentSongIndex() {
    localStorage.setItem(CURRENT_SONG_INDEX_KEY, currentSongIndex);
}

// Navigation functions
function openNav() {
    document.getElementById('sideNav').style.left = "0";
    document.getElementById('mainContainer').classList.add('open-nav');
}

function closeNav() {
    document.getElementById('sideNav').style.left = "-250px";
    document.getElementById('mainContainer').classList.remove('open-nav');
}

// View management functions
function showAllSongs() {
    document.getElementById('songForm').style.display = 'block';
    document.getElementById('exportOptions').style.display = 'none';
    document.getElementById('collectionsContainer').style.display = 'none';
    document.getElementById('playlistContainer').style.display = 'none';
    currentCollectionId = null;
    renderChordList();
    renderPagination();
}

function showCollections() {
    document.getElementById('songForm').style.display = 'none';
    document.getElementById('exportOptions').style.display = 'none';
    document.getElementById('collectionsContainer').style.display = 'block';
    document.getElementById('playlistContainer').style.display = 'none';
    renderCollections();
}

function showPlaylist() {
    document.getElementById('songForm').style.display = 'none';
    document.getElementById('exportOptions').style.display = 'none';
    document.getElementById('collectionsContainer').style.display = 'none';
    document.getElementById('playlistContainer').style.display = 'block';
    renderPlaylist();
}

function showExportOptions() {
    document.getElementById('songForm').style.display = 'none';
    document.getElementById('exportOptions').style.display = 'flex';
    document.getElementById('collectionsContainer').style.display = 'none';
    document.getElementById('playlistContainer').style.display = 'none';
    currentCollectionId = null;
    renderChordList();
    renderPagination();
}

// CRUD Operations for Songs - FIXED VERSION
function saveChord() {
    const title = titleInput.value.trim();
    const lyrics = lyricsInput.value.trim();
    const editId = editIdInput.value;
    
    if (!title || !lyrics) {
        alert('Please enter both title and lyrics');
        return;
    }
    
    if (editId) {
        // Update existing chord
        const index = chords.findIndex(c => c.id == editId);
        if (index !== -1) {
            chords[index] = { ...chords[index], title, lyrics };
        }
    } else {
        // Add new chord
        const newId = chords.length > 0 ? Math.max(...chords.map(c => c.id)) + 1 : 1;
        chords.push({ id: newId, title, lyrics });
    }
    
    // Save to localStorage
    saveSongs();
    
    // Reset form
    clearForm();
    
    // Refresh UI
    renderChordList();
    renderPagination();
    renderPlaylist();
}

function editChord(id) {
    const chord = chords.find(c => c.id == id);
    if (chord) {
        titleInput.value = chord.title;
        lyricsInput.value = chord.lyrics;
        editIdInput.value = chord.id;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function deleteChord(id) {
    if (confirm('Are you sure you want to delete this song?')) {
        // Remove song from all collections first
        collections.forEach(collection => {
            collection.songIds = collection.songIds.filter(songId => songId !== id);
        });
        saveCollections();
        
        // Remove from playlist
        playlist = playlist.filter(songId => songId !== id);
        savePlaylist();
        
        // Then delete the song
        chords = chords.filter(c => c.id != id);
        saveSongs();
        
        renderChordList();
        renderPagination();
        renderCollections();
        renderPlaylist();
        
        // If we were viewing this song, close the modal
        if (currentViewingId == id) {
            closeModal();
        }
    }
}

function clearForm() {
    titleInput.value = '';
    lyricsInput.value = '';
    editIdInput.value = '';
}

// Collection functions
function showNewCollectionForm() {
    newCollectionFormEl.style.display = 'block';
}

function hideNewCollectionForm() {
    newCollectionFormEl.style.display = 'none';
    document.getElementById('newCollectionName').value = '';
}

function createCollection() {
    const name = document.getElementById('newCollectionName').value.trim();
    if (!name) {
        alert('Please enter a collection name');
        return;
    }
    
    const newId = collections.length > 0 ? Math.max(...collections.map(c => c.id)) + 1 : 1;
    collections.push({ id: newId, name, songIds: [] });
    saveCollections();
    hideNewCollectionForm();
    renderCollections();
}

function deleteCollection(id) {
    if (confirm('Are you sure you want to delete this collection? This will not delete the songs.')) {
        collections = collections.filter(c => c.id != id);
        saveCollections();
        renderCollections();
    }
}

function renderCollections() {
    collectionListEl.innerHTML = collections.map(collection => `
        <div class="collection-item">
            <span>${collection.name} (${collection.songIds.length} songs)</span>
            <div>
                <button class="action-btn view-btn" onclick="viewCollection(${collection.id})">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn delete-btn" onclick="deleteCollection(${collection.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function viewCollection(id) {
    const collection = collections.find(c => c.id == id);
    if (collection) {
        document.getElementById('collectionModalTitle').textContent = collection.name;
        const songsListEl = document.getElementById('collectionSongsList');
        
        const collectionSongs = chords.filter(song => collection.songIds.includes(song.id));
        
        if (collectionSongs.length === 0) {
            songsListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-music"></i>
                    <h3>No songs in this collection</h3>
                    <p>Add songs from the All Songs view</p>
                </div>
            `;
        } else {
            songsListEl.innerHTML = collectionSongs.map(song => `
                <div class="chord-card">
                    <h3 class="chord-title">${song.title}</h3>
                    <div class="chord-preview">${song.lyrics.substring(0, 100)}${song.lyrics.length > 100 ? '...' : ''}</div>
                    <div class="chord-actions">
                        <button class="action-btn view-btn" onclick="viewChord(${song.id}, true)">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="action-btn success-btn" onclick="addToPlaylist(${song.id})">
                            <i class="fas fa-plus"></i> Add to Playlist
                        </button>
                        <button class="action-btn danger-btn" onclick="removeFromCollection(${song.id}, ${collection.id})">
                            <i class="fas fa-minus"></i> Remove
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        currentCollectionId = id;
        document.getElementById('viewCollectionModal').style.display = 'block';
    }
}

function removeFromCollection(songId, collectionId) {
    const collection = collections.find(c => c.id == collectionId);
    if (collection) {
        collection.songIds = collection.songIds.filter(id => id !== songId);
        saveCollections();
        viewCollection(collectionId);
    }
}

function showAddToCollectionModal() {
    const collectionOptionsEl = document.getElementById('collectionOptions');
    collectionOptionsEl.innerHTML = collections.map(collection => `
        <div class="collection-item">
            <span>${collection.name}</span>
            <button class="action-btn ${collection.songIds.includes(currentViewingId) ? 'secondary-btn' : 'view-btn'}" 
                    onclick="${collection.songIds.includes(currentViewingId) ? `removeFromCollectionModal(${collection.id})` : `addToCollection(${collection.id})`}">
                <i class="fas ${collection.songIds.includes(currentViewingId) ? 'fa-check' : 'fa-plus'}"></i> 
                ${collection.songIds.includes(currentViewingId) ? 'Added' : 'Add'}
            </button>
        </div>
    `).join('');
    
    document.getElementById('collectionModal').style.display = 'block';
}

function addToCollection(collectionId) {
    const collection = collections.find(c => c.id == collectionId);
    if (collection && !collection.songIds.includes(currentViewingId)) {
        collection.songIds.push(currentViewingId);
        saveCollections();
        showAddToCollectionModal();
    }
}

function removeFromCollectionModal(collectionId) {
    const collection = collections.find(c => c.id == collectionId);
    if (collection) {
        collection.songIds = collection.songIds.filter(id => id !== currentViewingId);
        saveCollections();
        showAddToCollectionModal();
    }
}

// Playlist functions
function renderPlaylist() {
    if (playlist.length === 0) {
        playlistItemsEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-music"></i>
                <h3>Your playlist is empty</h3>
                <p>Add songs from the All Songs view to create your concert playlist</p>
            </div>
        `;
        return;
    }
    
    playlistItemsEl.innerHTML = playlist.map((songId, index) => {
        const song = chords.find(c => c.id == songId);
        if (!song) return '';
        
        return `
            <div class="playlist-item ${index === currentSongIndex ? 'active' : ''}" data-song-id="${song.id}">
                <div class="song-position">${index + 1}</div>
                <div class="song-info">
                    <h3>${song.title}</h3>
                    <p class="chord-preview">${song.lyrics.substring(0, 60)}${song.lyrics.length > 60 ? '...' : ''}</p>
                </div>
                <div class="playlist-actions">
                    <button class="action-btn view-btn" onclick="viewChord(${song.id}, true)"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-btn" onclick="editChord(${song.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" onclick="removeFromPlaylist(${song.id})"><i class="fas fa-trash"></i></button>
                    <button class="action-btn ${index === currentSongIndex ? 'success-btn' : 'secondary-btn'}" 
                            onclick="setCurrentSong(${index})">
                        <i class="fas ${index === currentSongIndex ? 'fa-play' : 'fa-music'}"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function addToPlaylist(songId) {
    if (!playlist.includes(songId)) {
        playlist.push(songId);
        savePlaylist();
        renderPlaylist();
        
        // If this is the first song added, set it as current
        if (playlist.length === 1) {
            currentSongIndex = 0;
            saveCurrentSongIndex();
        }
    }
}

function addToPlaylistFromModal() {
    if (currentViewingId) {
        addToPlaylist(currentViewingId);
    }
}

function removeFromPlaylist(songId) {
    const index = playlist.indexOf(songId);
    if (index !== -1) {
        playlist.splice(index, 1);
        savePlaylist();
        
        // Adjust current song index if needed
        if (currentSongIndex >= playlist.length) {
            currentSongIndex = playlist.length > 0 ? playlist.length - 1 : -1;
            saveCurrentSongIndex();
        } else if (index < currentSongIndex) {
            currentSongIndex--;
            saveCurrentSongIndex();
        }
        
        renderPlaylist();
    }
}

function clearPlaylist() {
    if (confirm('Are you sure you want to clear the entire playlist?')) {
        playlist = [];
        currentSongIndex = -1;
        savePlaylist();
        saveCurrentSongIndex();
        renderPlaylist();
    }
}

function setCurrentSong(index) {
    currentSongIndex = index;
    saveCurrentSongIndex();
    renderPlaylist();
}

function playCurrentSong() {
    if (currentSongIndex >= 0 && currentSongIndex < playlist.length) {
        const songId = playlist[currentSongIndex];
        viewChord(songId, true);
    } else {
        alert('No song selected in playlist');
    }
}

function playNextSong() {
    if (playlist.length === 0) return;
    
    currentSongIndex = (currentSongIndex + 1) % playlist.length;
    saveCurrentSongIndex();
    renderPlaylist();
    playCurrentSong();
}

function playPreviousSong() {
    if (playlist.length === 0) return;
    
    currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
    saveCurrentSongIndex();
    renderPlaylist();
    playCurrentSong();
}

function savePlaylist() {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlist));
    alert('Playlist saved!');
}

// Viewing functions
function viewChord(id, fromCollection = false) {
    const chord = chords.find(c => c.id == id);
    if (chord) {
        document.getElementById('modalTitle').textContent = chord.title;
        
        // Process lyrics to highlight chords
        const processedLyrics = chord.lyrics.replace(/\[(.*?)\]/g, '<span class="chord">[$1]</span>');
        document.getElementById('modalLyrics').innerHTML = processedLyrics;
        
        // Hide "Add to Collection" button if viewing from a collection
        const addToCollectionBtn = document.querySelector('.modal-actions button:nth-child(2)');
        if (addToCollectionBtn) {
            addToCollectionBtn.style.display = fromCollection ? 'none' : 'block';
        }
        
        document.getElementById('lyricsModal').style.display = 'block';
        currentViewingId = id;
    }
}

function editCurrentSong() {
    if (currentViewingId) {
        editChord(currentViewingId);
        closeModal();
    }
}

function closeModal() {
    document.getElementById('lyricsModal').style.display = 'none';
    currentViewingId = null;
}

function closeCollectionModal() {
    document.getElementById('collectionModal').style.display = 'none';
}

function closeViewCollectionModal() {
    document.getElementById('viewCollectionModal').style.display = 'none';
    currentCollectionId = null;
}

// Filtering and pagination
function filterChords() {
    currentPage = 1;
    renderChordList();
    renderPagination();
}

function getFilteredChords() {
    const searchTerm = searchBarEl.value.toLowerCase();
    let filtered = chords;
    
    if (currentCollectionId) {
        const collection = collections.find(c => c.id == currentCollectionId);
        if (collection) {
            filtered = chords.filter(song => collection.songIds.includes(song.id));
        }
    }
    
    if (searchTerm) {
        filtered = filtered.filter(c => 
            c.title.toLowerCase().includes(searchTerm) || 
            c.lyrics.toLowerCase().includes(searchTerm)
        );
    }
    
    return filtered;
}

function getPaginatedChords() {
    const filtered = getFilteredChords();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
}

function changePage(page) {
    currentPage = page;
    renderChordList();
    renderPagination();
}

// Rendering functions
function renderChordList() {
    const paginatedChords = getPaginatedChords();
    const filteredChords = getFilteredChords();
    
    if (filteredChords.length === 0) {
        const searchTerm = searchBarEl.value;
        chordListEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-${searchTerm ? 'search' : 'music'}"></i>
                <h3>${searchTerm ? 'No songs found' : 'Your songbook is empty'}</h3>
                <p>${searchTerm ? 'Try a different search term' : 'Add your first song to get started!'}</p>
            </div>
        `;
        return;
    }
    
    chordListEl.innerHTML = paginatedChords.map(chord => `
        <div class="chord-card">
            <h3 class="chord-title">${chord.title}</h3>
            <div class="chord-preview">${chord.lyrics.substring(0, 100)}${chord.lyrics.length > 100 ? '...' : ''}</div>
            <div class="chord-actions">
                <button class="action-btn view-btn" onclick="viewChord(${chord.id})"><i class="fas fa-eye"></i> View</button>
                <button class="action-btn edit-btn" onclick="editChord(${chord.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="action-btn success-btn" onclick="addToPlaylist(${chord.id})"><i class="fas fa-plus"></i> Add to Playlist</button>
                <button class="action-btn delete-btn" onclick="deleteChord(${chord.id})"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

function renderPagination() {
    const filteredChords = getFilteredChords();
    const totalPages = Math.ceil(filteredChords.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
    }
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="page-dots">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="page-dots">...</span>`;
        }
        paginationHTML += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="changePage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
    }
    
    paginationEl.innerHTML = paginationHTML;
}

// Export functions
function exportAllSongsPDF() {
    exportSongsToPDF(chords, 'All_Songs');
}

function exportCurrentViewPDF() {
    const filteredChords = getFilteredChords();
    exportSongsToPDF(filteredChords, 'Current_View_Songs');
}

function exportCollectionPDF() {
    if (!currentCollectionId) return;
    
    const collection = collections.find(c => c.id == currentCollectionId);
    if (collection) {
        const collectionSongs = chords.filter(song => collection.songIds.includes(song.id));
        exportSongsToPDF(collectionSongs, collection.name.replace(/\s+/g, '_'));
    }
}

function exportSongsToPDF(songs, filename) {
    const doc = new jsPDF();
    let yPosition = 20;
    
    songs.forEach((song, index) => {
        // Add song title
        doc.setFontSize(16);
        doc.text(song.title, 15, yPosition);
        yPosition += 10;
        
        // Add lyrics with proper formatting
        doc.setFontSize(12);
        const lyricsLines = doc.splitTextToSize(song.lyrics, 180);
        doc.text(lyricsLines, 15, yPosition);
        
        // Calculate new yPosition
        yPosition += lyricsLines.length * 7 + 15;
        
        // Add page break if needed, except for last song
        if (yPosition > 270 && index < songs.length - 1) {
            doc.addPage();
            yPosition = 20;
        }
    });
    
    doc.save(`${filename}.pdf`);
}

function exportAllSongsTXT() {
    exportSongsToTXT(chords, 'All_Songs');
}

function exportCollectionTXT() {
    if (!currentCollectionId) return;
    
    const collection = collections.find(c => c.id == currentCollectionId);
    if (collection) {
        const collectionSongs = chords.filter(song => collection.songIds.includes(song.id));
        exportSongsToTXT(collectionSongs, collection.name.replace(/\s+/g, '_'));
    }
}

function exportSongsToTXT(songs, filename) {
    let textContent = '';
    
    songs.forEach(song => {
        textContent += `${song.title}\n\n`;
        textContent += `${song.lyrics}\n\n`;
        textContent += '--------------------------------\n\n';
    });
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Close modals if clicked outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal();
        closeCollectionModal();
        closeViewCollectionModal();
    }
}

// Keyboard shortcuts for playlist navigation
document.addEventListener('keydown', function(e) {
    // Don't trigger if we're typing in an input field
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
    }
    
    if (e.key === 'ArrowRight') {
        playNextSong();
    } else if (e.key === 'ArrowLeft') {
        playPreviousSong();
    } else if (e.key === ' ') {
        e.preventDefault();
        playCurrentSong();
    }
});

// Previous code remains the same until the viewChord function

function viewChord(id, fromPlaylist = false) {
    const chord = chords.find(c => c.id == id);
    if (chord) {
        document.getElementById('modalTitle').textContent = chord.title;
        
        // Process lyrics to highlight chords
        const processedLyrics = chord.lyrics.replace(/\[(.*?)\]/g, '<span class="chord">[$1]</span>');
        document.getElementById('modalLyrics').innerHTML = processedLyrics;
        
        // Get modal elements
        const modalActions = document.querySelector('.modal-actions');
        const modalContent = document.querySelector('.modal-content');
        
        if (fromPlaylist) {
            // Show navigation controls for playlist view
            modalContent.classList.add('playlist-view');
            modalActions.innerHTML = `
                <button onclick="playPreviousSongFromModal()" class="secondary-btn nav-btn"><i class="fas fa-step-backward"></i> Previous</button>
                <button onclick="playNextSongFromModal()" class="success-btn nav-btn"><i class="fas fa-step-forward"></i> Next</button>
                <button onclick="closeModal()"><i class="fas fa-times"></i> Close</button>
            `;
        } else {
            // Show full controls for non-playlist views
            modalContent.classList.remove('playlist-view');
            modalActions.innerHTML = `
                <button onclick="editCurrentSong()"><i class="fas fa-edit"></i> Edit</button>
                <button onclick="showAddToCollectionModal()"><i class="fas fa-folder-plus"></i> Add to Collection</button>
                <button onclick="closeModal()"><i class="fas fa-times"></i> Close</button>
            `;
        }
        
        document.getElementById('lyricsModal').style.display = 'block';
        currentViewingId = id;
    }
}

function playPreviousSongFromModal() {
    if (currentViewingId && playlist.length > 0) {
        // Find the current song in the playlist
        const currentIndex = playlist.findIndex(id => id === currentViewingId);
        if (currentIndex !== -1) {
            // Calculate previous index (wrapping around if needed)
            const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
            const prevSongId = playlist[prevIndex];
            
            // Update current song index and save
            currentSongIndex = prevIndex;
            saveCurrentSongIndex();
            
            // View the previous song
            viewChord(prevSongId, true);
            
            // Update playlist highlight
            renderPlaylist();
        }
    }
}

function playNextSongFromModal() {
    if (currentViewingId && playlist.length > 0) {
        // Find the current song in the playlist
        const currentIndex = playlist.findIndex(id => id === currentViewingId);
        if (currentIndex !== -1) {
            // Calculate next index (wrapping around if needed)
            const nextIndex = (currentIndex + 1) % playlist.length;
            const nextSongId = playlist[nextIndex];
            
            // Update current song index and save
            currentSongIndex = nextIndex;
            saveCurrentSongIndex();
            
            // View the next song
            viewChord(nextSongId, true);
            
            // Update playlist highlight
            renderPlaylist();
        }
    }
}

// Update the playCurrentSong function
function playCurrentSong() {
    if (currentSongIndex >= 0 && currentSongIndex < playlist.length) {
        const songId = playlist[currentSongIndex];
        viewChord(songId, true);
    } else {
        alert('No song selected in playlist');
    }
}

// Update keyboard navigation
document.addEventListener('keydown', function(e) {
    // Don't trigger if we're typing in an input field
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
    }
    
    const modal = document.getElementById('lyricsModal');
    if (modal.style.display === 'block') {
        // Only handle navigation if viewing from playlist
        const fromPlaylist = document.querySelector('.modal-content.playlist-view') !== null;
        
        if (fromPlaylist) {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                playNextSongFromModal();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                playPreviousSongFromModal();
            } else if (e.key === 'Escape') {
                closeModal();
            }
        }
    } else {
        if (e.key === 'ArrowRight') {
            playNextSong();
        } else if (e.key === 'ArrowLeft') {
            playPreviousSong();
        } else if (e.key === ' ') {
            e.preventDefault();
            playCurrentSong();
        }
    }
});

// Rest of your existing JavaScript remains the same