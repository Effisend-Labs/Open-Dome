<RULE[whatsapp_style_inputs]>
ROLE: FRONTEND ARCHITECT & REACT NATIVE SPECIALIST

When tasked with building or fixing auto-growing multiline chat inputs (like WhatsApp or iMessage) in React Native (specifically for Web/Expo compatibility), you MUST use the "Hidden Shadow Text Measurement" pattern combined with rigid mathematical height clamping to guarantee flawless growing and shrinking without flickering or text cropping.

**DO NOT:**
- Do NOT rely entirely on `TextInput`'s `onContentSizeChange` to manage height state for dynamic shrinking on Web. React Native Web `<textarea>` components often fail to reduce their `scrollHeight` when text is deleted, causing the input to get "stuck" at maximum height.
- Do NOT reset the DOM node height manually (e.g., `ref.current.style.height = '40px'`) inside `onChangeText`. This causes severe visual flickering on every keystroke.
- Do NOT leave `lineHeight` to browser defaults. This makes exact row-height calculation impossible.

**REQUIRED IMPLEMENTATION (The Shadow Text Pattern & Typography Math):**
1. **Typography & Padding Math (CRITICAL):**
   - You MUST define an explicit `lineHeight` (e.g., `20`) on the input styles so row calculation is mathematically precise.
   - You MUST define generous vertical padding (e.g., `paddingTop: 14`, `paddingBottom: 14`) so the text never looks cropped against rounded borders.
   - Calculate your clamps perfectly:
     - `MIN_HEIGHT` = `(lineHeight * 1) + paddingVertical` (e.g., `20 + 28 = 48`)
     - `MAX_HEIGHT` = `(lineHeight * 4) + paddingVertical` (e.g., `80 + 28 = 108` for exactly 4 rows)
2. **Container Setup:** Place both the hidden measurement text and the actual input inside a shared relative wrapper.
3. **Hidden Measurement `<Text>`:**
   - Must mirror the `<TextInput>` styling EXACTLY (padding, font size, font family, line height, width).
   - Must be hidden visually: `{ position: 'absolute', opacity: 0, zIndex: -1, top: 0, left: 0, right: 0 }`.
   - Render the current input value inside it. Important: If empty, render a space (`' '`) or append a space to the prompt to maintain the baseline height.
   - Attach `onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}` to this text to flawlessly measure the natural text height.
4. **The `<TextInput>`:**
   - Apply the mathematically clamped height dynamically based on the state measured by the hidden text: `{ height: Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, inputHeight)) }`
   - Set `multiline={true}` and `showsVerticalScrollIndicator={false}`.
5. **Layout Context & Button Alignment:**
   - Ensure the parent container of the input bar uses `alignItems: 'flex-end'` so that the send button anchors to the bottom as the input grows vertically.
   - Add a `marginBottom` to the send button so its absolute center perfectly aligns with the absolute center of the text input container when the input is in its single-line state. (e.g., if input is 52px tall and button is 44px tall, `marginBottom` should be `(52 - 44) / 2 = 4`).
6. **Web Scrollbar Fix:** On Web platforms, you must inject CSS to hide the ugly default textarea scrollbar while keeping the scroll functionality (`textarea::-webkit-scrollbar { display: none; }`).

Example Structure:
```jsx
// 20px lineHeight + 28px vertical padding = 48px Base Height
const [inputHeight, setInputHeight] = useState(48); 

<View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
  <View style={{ flex: 1, minHeight: 52, position: 'relative' }}> {/* 48px + borders */}
    {/* Shadow Text for exact measurement */}
    <Text 
      style={[styles.input, { position: 'absolute', opacity: 0, zIndex: -1, top: 0, left: 0, right: 0 }]}
      onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
    >
      {prompt ? prompt + ' ' : ' '}
    </Text>
    
    {/* Actual Input clamped precisely between 1 row (48px) and 4 rows (108px) */}
    <TextInput
      style={[styles.input, { height: Math.max(48, Math.min(108, inputHeight)) }]}
      multiline
      value={prompt}
      onChangeText={setPrompt}
    />
  </View>
  <TouchableOpacity style={{ height: 44, marginBottom: 4 }} /> {/* Centered on 1-line state */}
</View>
```
</RULE[whatsapp_style_inputs]>
