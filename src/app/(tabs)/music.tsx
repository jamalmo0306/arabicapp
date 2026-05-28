import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { getAllSongs, insertSong, deleteSong, updateSong } from '@/lib/db';
import type { Song } from '@/context/types';
import { useAppContext } from '@/context/app-context';
import type { AppColors } from '@/lib/theme';

type ViewMode = 'all' | 'arabic' | 'translit' | 'english';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'all',     label: 'All'    },
  { key: 'arabic',  label: 'عربي'   },
  { key: 'translit',label: 'Latin'  },
  { key: 'english', label: 'EN'     },
];

function SongDetail({ song, onClose, onDelete, onEdit }: {
  song: Song;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { colors } = useAppContext();
  const C = colors;
  const sd = useMemo(() => makeSdStyles(C), [C]);

  const [mode, setMode] = useState<ViewMode>('all');

  const arabicLines  = song.arabic_lyrics.split('\n');
  const translitLines= song.transliteration.split('\n');
  const englishLines = song.english_translation.split('\n');
  const maxLines = Math.max(arabicLines.length, translitLines.length, englishLines.length);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={sd.header}>
          <TouchableOpacity onPress={onClose} style={sd.backBtn}>
            <Text style={sd.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text style={sd.title} numberOfLines={1}>{song.title}</Text>
            {song.artist ? <Text style={sd.artist}>{song.artist}</Text> : null}
          </View>
          <TouchableOpacity onPress={onEdit} style={sd.editBtn}>
            <Text style={sd.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={sd.toggleRow}>
          {VIEW_MODES.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[sd.toggleBtn, mode === m.key && sd.toggleBtnActive]}
              onPress={() => setMode(m.key)}
            >
              <Text style={[sd.toggleLabel, mode === m.key && sd.toggleLabelActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={sd.lyricsContent} showsVerticalScrollIndicator={false}>
          {Array.from({ length: maxLines }, (_, i) => {
            const ar = arabicLines[i] ?? '';
            const tr = translitLines[i] ?? '';
            const en = englishLines[i] ?? '';
            const isEmpty = !ar && !tr && !en;
            if (isEmpty) return <View key={i} style={sd.blankLine} />;
            return (
              <View key={i} style={sd.lineBlock}>
                {(mode === 'all' || mode === 'arabic') && ar ? (
                  <Text style={sd.arabicLine}>{ar}</Text>
                ) : null}
                {(mode === 'all' || mode === 'translit') && tr ? (
                  <Text style={sd.translitLine}>{tr}</Text>
                ) : null}
                {(mode === 'all' || mode === 'english') && en ? (
                  <Text style={sd.englishLine}>{en}</Text>
                ) : null}
              </View>
            );
          })}
          <TouchableOpacity style={sd.deleteBtn} onPress={onDelete}>
            <Text style={sd.deleteBtnText}>Delete Song</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeSdStyles(C: AppColors) {
  return StyleSheet.create({
    header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn:          { paddingVertical: 6, paddingRight: 8 },
    backText:         { color: C.gold, fontSize: 15, fontWeight: '700' },
    title:            { color: C.textLight, fontSize: 18, fontWeight: '800' },
    artist:           { color: C.mutedLight, fontSize: 13, marginTop: 1 },
    editBtn:          { paddingVertical: 6, paddingLeft: 8 },
    editText:         { color: C.olive, fontSize: 14, fontWeight: '700' },
    toggleRow:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
    toggleBtn:        { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: C.btnInactive, borderWidth: 1, borderColor: C.borderGold },
    toggleBtnActive:  { backgroundColor: C.oliveDim, borderColor: C.olive },
    toggleLabel:      { color: C.mutedLight, fontSize: 13, fontWeight: '700' },
    toggleLabelActive:{ color: C.olive, fontSize: 13, fontWeight: '800' },
    lyricsContent:    { paddingHorizontal: 16, paddingBottom: 120 },
    lineBlock:        { marginBottom: 12 },
    blankLine:        { height: 10 },
    arabicLine:       { color: C.textLight, fontSize: 20, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl', lineHeight: 30 },
    translitLine:     { color: C.gold, fontSize: 15, lineHeight: 22, marginTop: 2 },
    englishLine:      { color: C.mutedLight, fontSize: 14, lineHeight: 20, marginTop: 2 },
    deleteBtn:        { marginTop: 24, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(192,57,43,0.40)', alignItems: 'center' },
    deleteBtnText:    { color: '#C0392B', fontSize: 14, fontWeight: '700' },
  });
}

function AddEditModal({ visible, song, onSave, onClose }: {
  visible: boolean;
  song?: Song;
  onSave: (data: Omit<Song, 'id' | 'created_at'>) => void;
  onClose: () => void;
}) {
  const { colors } = useAppContext();
  const C = colors;
  const am = useMemo(() => makeAmStyles(C), [C]);

  const [title,   setTitle  ] = useState('');
  const [artist,  setArtist ] = useState('');
  const [arabic,  setArabic ] = useState('');
  const [translit,setTranslit] = useState('');
  const [english, setEnglish] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle(song?.title ?? '');
      setArtist(song?.artist ?? '');
      setArabic(song?.arabic_lyrics ?? '');
      setTranslit(song?.transliteration ?? '');
      setEnglish(song?.english_translation ?? '');
    }
  }, [visible, song]);

  const canSave = title.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={am.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={am.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={am.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={am.heading}>{song ? 'Edit Song' : 'Add Song'}</Text>
          <TouchableOpacity onPress={() => canSave && onSave({ title: title.trim(), artist: artist.trim(), arabic_lyrics: arabic, transliteration: translit, english_translation: english })} disabled={!canSave}>
            <Text style={[am.save, !canSave && { opacity: 0.4 }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={am.body}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <Text style={am.fieldLabel}>Song Title *</Text>
          <TextInput style={am.input} value={title} onChangeText={setTitle} placeholder="e.g. Habibi" placeholderTextColor={C.mutedLight} />

          <Text style={am.fieldLabel}>Artist</Text>
          <TextInput style={am.input} value={artist} onChangeText={setArtist} placeholder="e.g. Fairuz" placeholderTextColor={C.mutedLight} />

          <Text style={am.fieldLabel}>Arabic Lyrics</Text>
          <Text style={am.fieldHint}>Paste the Arabic text, one line per lyric line</Text>
          <TextInput style={[am.input, am.multiline]} value={arabic} onChangeText={setArabic} placeholder="أنا بحبك..." placeholderTextColor={C.mutedLight} multiline textAlignVertical="top" />

          <Text style={am.fieldLabel}>Transliteration</Text>
          <Text style={am.fieldHint}>Latin-alphabet pronunciation, matching line for line</Text>
          <TextInput style={[am.input, am.multiline]} value={translit} onChangeText={setTranslit} placeholder="Ana bahibbak..." placeholderTextColor={C.mutedLight} multiline textAlignVertical="top" />

          <Text style={am.fieldLabel}>English Translation</Text>
          <Text style={am.fieldHint}>Translation, matching line for line</Text>
          <TextInput style={[am.input, am.multiline]} value={english} onChangeText={setEnglish} placeholder="I love you..." placeholderTextColor={C.mutedLight} multiline textAlignVertical="top" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeAmStyles(C: AppColors) {
  return StyleSheet.create({
    container:  { flex: 1, backgroundColor: C.bg },
    header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.borderGold },
    heading:    { color: C.textLight, fontSize: 16, fontWeight: '800' },
    cancel:     { color: C.mutedLight, fontSize: 15, fontWeight: '600' },
    save:       { color: C.olive, fontSize: 15, fontWeight: '800' },
    body:       { padding: 20, gap: 6, paddingBottom: 80 },
    fieldLabel: { color: C.gold, fontSize: 13, fontWeight: '700', marginTop: 14 },
    fieldHint:  { color: C.mutedLight, fontSize: 11, marginBottom: 4 },
    input:      { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.textLight, fontSize: 15 },
    multiline:  { height: 140, textAlignVertical: 'top' },
  });
}

const LYRICS_PROMPT = `I'm going to paste raw Arabic lyrics below. Please do the following:

1. Take the Arabic lyrics exactly as given (clean up any stray characters if needed)
2. Write a transliteration (Latin pronunciation) for every Arabic line
3. Write a natural English translation for every Arabic line
4. Use a blank line wherever there is a blank line in the Arabic — verse breaks must appear in all three sections at the same position

Before you output anything, count the non-blank lines in each section and confirm all three counts match. If they don't, fix it before outputting.

Output ONLY the three sections below — no intro, no commentary, no line numbers:

ARABIC LYRICS:
[your cleaned Arabic]

TRANSLITERATION:
[line-by-line transliteration]

ENGLISH TRANSLATION:
[line-by-line translation]

---
Arabic lyrics to process:
[PASTE YOUR ARABIC LYRICS HERE]`;

export default function MusicScreen() {
  const { colors } = useAppContext();
  const C = colors;
  const s = useMemo(() => makeStyles(C), [C]);

  const [songs,        setSongs      ] = useState<Song[]>([]);
  const [selected,     setSelected   ] = useState<Song | null>(null);
  const [modalSong,    setModalSong  ] = useState<Song | undefined>(undefined);
  const [showModal,    setShowModal  ] = useState(false);
  const [showPrompt,   setShowPrompt ] = useState(false);
  const [loading,      setLoading    ] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setSongs(await getAllSongs());
    setLoading(false);
  }

  async function handleSave(data: Omit<Song, 'id' | 'created_at'>) {
    if (modalSong) {
      await updateSong(modalSong.id, data);
      const updated = { ...modalSong, ...data };
      setSongs(prev => prev.map(s => s.id === modalSong.id ? updated : s));
      if (selected?.id === modalSong.id) setSelected(updated);
    } else {
      const id = await insertSong({ ...data, created_at: new Date().toISOString() });
      const newSong: Song = { id, ...data, created_at: new Date().toISOString() };
      setSongs(prev => [newSong, ...prev]);
    }
    setShowModal(false);
    setModalSong(undefined);
  }

  function confirmDelete(song: Song) {
    Alert.alert('Delete Song', `Remove "${song.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteSong(song.id);
          setSongs(prev => prev.filter(s => s.id !== song.id));
          if (selected?.id === song.id) setSelected(null);
        },
      },
    ]);
  }

  if (selected) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
        <SongDetail
          song={selected}
          onClose={() => setSelected(null)}
          onDelete={() => confirmDelete(selected)}
          onEdit={() => { setModalSong(selected); setShowModal(true); }}
        />
        <AddEditModal
          visible={showModal}
          song={modalSong}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setModalSong(undefined); }}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={C.statusBar} backgroundColor={C.statusBarBg} />

      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView style={s.screen} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          <View style={s.header}>
            <Text style={s.heading}>🎵 Music</Text>
            <View style={s.headerBtns}>
              <TouchableOpacity style={s.promptBtn} onPress={() => setShowPrompt(true)}>
                <Text style={s.promptBtnText}>Get Prompt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.addBtn} onPress={() => { setModalSong(undefined); setShowModal(true); }}>
                <Text style={s.addBtnText}>+ Add Song</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? null : songs.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🎶</Text>
              <Text style={s.emptyTitle}>No songs yet</Text>
              <Text style={s.emptySub}>Tap "+ Add Song" to paste lyrics and start learning from Arabic music.</Text>
            </View>
          ) : (
            songs.map(song => (
              <TouchableOpacity key={song.id} style={s.songCard} activeOpacity={0.82} onPress={() => setSelected(song)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.songTitle}>{song.title}</Text>
                  {song.artist ? <Text style={s.songArtist}>{song.artist}</Text> : null}
                  <Text style={s.songPreview} numberOfLines={1}>
                    {song.arabic_lyrics.split('\n')[0]}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(song)} hitSlop={12} style={s.songDeleteBtn}>
                  <Text style={s.songDeleteText}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}

        </ScrollView>
      </SafeAreaView>

      <AddEditModal
        visible={showModal}
        song={modalSong}
        onSave={handleSave}
        onClose={() => { setShowModal(false); setModalSong(undefined); }}
      />

      {/* Lyrics prompt modal */}
      <Modal visible={showPrompt} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPrompt(false)}>
        <View style={pm.container}>
          <View style={pm.header}>
            <TouchableOpacity onPress={() => setShowPrompt(false)}>
              <Text style={pm.cancel}>Close</Text>
            </TouchableOpacity>
            <Text style={pm.heading}>Claude Lyrics Prompt</Text>
            <TouchableOpacity onPress={() => Share.share({ message: LYRICS_PROMPT, title: 'Arabic Lyrics Prompt' })}>
              <Text style={pm.share}>Share</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={pm.body}>
            <Text style={pm.hint}>
              Copy this prompt and paste it into Claude web. Replace the song name and artist, then paste the three sections into the Add Song form.
            </Text>
            <TextInput
              style={pm.promptBox}
              value={LYRICS_PROMPT}
              multiline
              editable={false}
              selectTextOnFocus
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const pm = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15150F' },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,213,121,0.13)' },
  heading:   { color: '#F7E8C0', fontSize: 16, fontWeight: '800' },
  cancel:    { color: '#CFC4AE', fontSize: 15, fontWeight: '600' },
  share:     { color: '#9BC76D', fontSize: 15, fontWeight: '800' },
  body:      { padding: 20, gap: 14, paddingBottom: 60 },
  hint:      { color: '#CFC4AE', fontSize: 13, lineHeight: 20 },
  promptBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,213,121,0.28)',
    borderRadius: 12,
    padding: 14,
    color: '#F7E8C0',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
    textAlignVertical: 'top',
    minHeight: 400,
  },
});

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    safe:       { flex: 1, backgroundColor: C.scrollBg },
    screen:     { flex: 1, backgroundColor: C.scrollBg },
    content:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 },

    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    heading:     { color: C.textDark, fontSize: 28, fontWeight: '800' },
    headerBtns:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    promptBtn:   { backgroundColor: C.blackGlass, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.borderGold },
    promptBtnText:{ color: C.mutedLight, fontSize: 13, fontWeight: '700' },
    addBtn:      { backgroundColor: C.blackGlass, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.borderGold },
    addBtnText:  { color: C.gold, fontSize: 14, fontWeight: '800' },

    empty:      { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyEmoji: { fontSize: 52 },
    emptyTitle: { color: C.textDark, fontSize: 20, fontWeight: '800' },
    emptySub:   { color: C.mutedDark, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },

    songCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.blackGlass, borderRadius: 16, borderWidth: 1, borderColor: C.borderGold, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10 },
    songTitle:  { color: C.textLight, fontSize: 16, fontWeight: '800' },
    songArtist: { color: C.mutedLight, fontSize: 13, marginTop: 2 },
    songPreview:{ color: C.gold, fontSize: 14, marginTop: 6, opacity: 0.85 },
    songArrow:      { color: C.mutedLight, fontSize: 18, marginLeft: 12 },
    songDeleteBtn:  { paddingHorizontal: 10, paddingVertical: 6, marginLeft: 4 },
    songDeleteText: { color: 'rgba(192,57,43,0.65)', fontSize: 18, fontWeight: '700' },
  });
}
