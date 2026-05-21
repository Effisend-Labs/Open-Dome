import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Vibration, Platform, Easing } from 'react-native';
import { GLOBAL_STYLES } from '../theme';

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const checkWinner = (squares) => {
  for (let i = 0; i < WINNING_LINES.length; i++) {
    const [a, b, c] = WINNING_LINES[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: WINNING_LINES[i], index: i };
    }
  }
  return null;
};

const NeonToken = ({ type, tokens, isDark, isDimmed }) => {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: Platform.OS !== 'web' }).start();
  }, []);

  const color = type === 'X' ? tokens.NEON_PRIMARY : tokens.NEON_DANGER;
  
  // 1. The Definitive Web vs Native Glow Logic
  const webGlow = Platform.OS === 'web' && isDark 
    ? { filter: `drop-shadow(0px 0px 8px ${color})` } // Traces exact pixel shapes
    : {};
    
  const nativeGlow = Platform.OS !== 'web' && isDark 
    ? { shadowColor: color, shadowOpacity: 0.8, shadowRadius: 10 } 
    : {};

  return (
    // 2. Apply the glow to the TOP wrapper, letting the CSS filter do the heavy lifting
    <Animated.View style={[
      styles.tokenContainer, 
      { transform: [{ scale }], opacity: isDimmed ? 0.3 : 1 },
      webGlow, 
      nativeGlow
    ]}>
      {type === 'X' ? (
        <View style={styles.singleBatContainer}>
          <View style={styles.batWrapper}>
            {/* 3. Strip all shadows from the inner elements! */}
            <View style={[styles.batBarrel, { backgroundColor: color }]} />
            <View style={[styles.batHandle, { backgroundColor: color }]} />
            <View style={[styles.batKnob, { backgroundColor: color }]} />
          </View>
        </View>
      ) : (
        <View style={[styles.ballInner, { borderColor: color }]}>
          <View style={[styles.stitchLeft, { borderRightColor: color }]} />
          <View style={[styles.stitchRight, { borderLeftColor: color }]} />
        </View>
      )}
    </Animated.View>
  );
};

export default function GameView({ isAuthorized, username, theme, tokens, scores, setScores }) {
  const isDark = theme === 'dark';
  const [gameMode, setGameMode] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isP1Next, setIsP1Next] = useState(true);
  const [winData, setWinData] = useState(null);
  const [draw, setDraw] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [nextToStart, setNextToStart] = useState('P1');

  const resultAnim = useRef(new Animated.Value(0)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;

  // Winner effect
  useEffect(() => {
    const result = checkWinner(board);
    if (result) {
      setWinData(result);
      setScores(prev => ({ ...prev, [result.winner === 'X' ? 'P1' : 'AI']: prev[result.winner === 'X' ? 'P1' : 'AI'] + 1 }));
      setNextToStart(result.winner === 'X' ? 'AI' : 'P1');
      showResult();
      Animated.timing(lineAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
      if (Platform.OS !== 'web') Vibration.vibrate([0, 100, 50, 100]);
    } else if (!board.includes(null)) {
      setDraw(true);
      showResult();
    }
  }, [board]);

  const showResult = () => {
    Animated.timing(resultAnim, {
      toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  // AI Logic - Fixed to defeat stale closures
  const makeAiMove = () => {
    setBoard(currentBoard => {
      if (winData || draw || !currentBoard.includes(null)) return currentBoard;
      
      const available = currentBoard.map((v, i) => v === null ? i : null).filter(v => v !== null);
      if (available.length === 0) return currentBoard;

      let bestMove = null;
      for (let i of available) {
        const test = [...currentBoard]; test[i] = 'O';
        if (checkWinner(test)) { bestMove = i; break; }
      }
      if (bestMove === null) {
        for (let i of available) {
          const test = [...currentBoard]; test[i] = 'X';
          if (checkWinner(test)) { bestMove = i; break; }
        }
      }
      if (bestMove === null) bestMove = available.includes(4) ? 4 : available[Math.floor(Math.random() * available.length)];

      const newBoard = [...currentBoard];
      newBoard[bestMove] = 'O';
      return newBoard;
    });
    setIsP1Next(true);
  };

  useEffect(() => {
    let timer;
    const isAiTurn = (gameMode === 'SOLO' && !isP1Next && !winData && !draw);
    
    if (isAiTurn) {
      setIsAiThinking(true);
      timer = setTimeout(() => {
        makeAiMove();
        setIsAiThinking(false);
      }, 500);
    } else {
      setIsAiThinking(false);
    }
    return () => clearTimeout(timer);
  }, [isP1Next, gameMode, winData, draw]);

  const handlePress = (index) => {
    if (board[index] || winData || draw || !isAuthorized || isAiThinking) return;
    const newBoard = [...board];
    newBoard[index] = isP1Next ? 'X' : 'O';
    setBoard(newBoard);
    setIsP1Next(!isP1Next);
  };

  const nextRound = () => {
    resultAnim.setValue(0);
    lineAnim.setValue(0);
    setBoard(Array(9).fill(null));
    setIsP1Next(nextToStart === 'P1');
    setWinData(null);
    setDraw(false);
  };

  const exitToMenu = () => {
    nextRound();
    setGameMode(null);
  };

  const renderWinningLine = () => {
    if (!winData) return null;
    const { index } = winData;
    let style = { position: 'absolute', backgroundColor: winData.winner === 'X' ? tokens.NEON_PRIMARY : tokens.NEON_DANGER, zIndex: 10 };
    const glow = isDark ? { shadowColor: style.backgroundColor, shadowOpacity: 1, shadowRadius: 15, elevation: 10 } : {};

    if (index <= 2) style = { ...style, height: 4, width: '100%', top: `${16.6 + (index * 33.3)}%` };
    else if (index >= 3 && index <= 5) style = { ...style, width: 4, height: '100%', left: `${16.6 + ((index - 3) * 33.3)}%` };
    else if (index === 6) style = { ...style, height: 4, width: '140%', top: '50%', left: '-20%', transform: [{ rotate: '45deg' }] };
    else if (index === 7) style = { ...style, height: 4, width: '140%', top: '50%', left: '-20%', transform: [{ rotate: '-45deg' }] };

    return <Animated.View style={[style, glow, { opacity: lineAnim }]} />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG }}>
      {!gameMode ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: 30 }}>
          <Text style={{ color: tokens.FG, fontSize: 32, fontWeight: GLOBAL_STYLES.heavy, marginBottom: 4, fontFamily: GLOBAL_STYLES.monospace }}>
            ARCADE LOBBY
          </Text>
          <Text style={{ color: tokens.NEON_DANGER, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 40, fontFamily: GLOBAL_STYLES.monospace }}>
            PLAYER: {username?.toUpperCase() || 'GUEST_00'}
          </Text>

          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: tokens.NEON_DANGER }]} onPress={() => setGameMode('SOLO')}>
            <Text style={styles.menuBtnText}>PLAY SOLO (VS AI)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: 'transparent', borderWidth: 2, borderColor: tokens.FG }]} onPress={() => setGameMode('DUO')}>
            <Text style={[styles.menuBtnText, { color: tokens.FG }]}>PLAY LOCAL (2P)</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 20 }}>
          {/* Scoreboard */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {[
              { id: 'P1', label: 'PLAYER 1 (X)', active: isP1Next },
              { id: 'AI', label: gameMode === 'SOLO' ? 'AI (O)' : 'PLAYER 2 (O)', active: !isP1Next }
            ].map((p) => (
              <View key={p.id} style={[styles.scoreCard, { backgroundColor: tokens.SURFACE, borderLeftWidth: 4, borderLeftColor: p.active ? (p.id === 'P1' ? tokens.NEON_PRIMARY : tokens.NEON_DANGER) : tokens.BORDER }]}>
                <Text style={[styles.scoreLabel, { color: tokens.MUTED }]}>{p.label}</Text>
                <Text style={[styles.scoreValue, { color: tokens.FG }]}>{isAiThinking && p.id === 'AI' ? '...' : scores[p.id]}</Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View style={[styles.grid, { borderColor: tokens.BORDER }]}>
            {board.map((cell, i) => (
              <TouchableOpacity key={i} style={[styles.cell, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]} onPress={() => handlePress(i)} activeOpacity={0.9}>
                {cell && <NeonToken type={cell} tokens={tokens} isDark={isDark} isDimmed={winData && !winData.line.includes(i)} />}
              </TouchableOpacity>
            ))}
            {renderWinningLine()}
          </View>

          {/* Result overlay */}
          {(winData || draw) && (
            <Animated.View style={[
              styles.overlay, 
              { 
                opacity: resultAnim,
                // 1. Dynamic Backdrop: Deep void for Dark, Frosted glass for Light
                backgroundColor: isDark ? 'rgba(10,10,12,0.95)' : 'rgba(244,244,245,0.95)' 
              }
            ]}>
              <View style={[styles.resultCard, { borderColor: tokens.FG, backgroundColor: tokens.SURFACE }]}>
                <Text style={[
                  styles.resultTitle, 
                  { 
                    // 2. Fix Text Color: Use the Neon token directly so it's visible on white cards
                    color: draw ? tokens.NEON_WARNING : (winData?.winner === 'X' ? tokens.NEON_PRIMARY : tokens.NEON_DANGER),
                    // 3. Keep the glow strictly for dark mode
                    textShadowColor: draw ? tokens.NEON_WARNING : (winData?.winner === 'X' ? tokens.NEON_PRIMARY : tokens.NEON_DANGER),
                    textShadowRadius: isDark ? 15 : 0,
                    textShadowOffset: { width: 0, height: 0 }
                  }
                ]}>
                  {draw ? 'DRAW' : 'WINNER'}
                </Text>
                
                {!draw && (
                  <Text style={[styles.resultSubtitle, { color: tokens.FG }]}>
                    {winData.winner === 'X' ? 'PLAYER 1' : (gameMode === 'SOLO' ? 'AI SYSTEM' : 'PLAYER 2')}
                  </Text>
                )}

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: tokens.NEON_PRIMARY, marginTop: 30 }]} onPress={nextRound}>
                  {/* 4. Fix Button Text: Ensure high contrast against the Corporate Blue in light mode */}
                  <Text style={[styles.actionBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>PLAY AGAIN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exitBtn} onPress={exitToMenu}>
                  <Text style={{ color: tokens.MUTED, fontSize: 10, fontWeight: 'bold', fontFamily: GLOBAL_STYLES.monospace }}>EXIT TO MENU</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  menuBtn: { height: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderRadius: 0 },
  menuBtnText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1, fontFamily: GLOBAL_STYLES.monospace },
  scoreCard: { flex: 1, padding: 12 },
  scoreLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 4, fontFamily: GLOBAL_STYLES.monospace },
  scoreValue: { fontSize: 18, fontWeight: '900', fontFamily: GLOBAL_STYLES.monospace },
  grid: { width: '100%', aspectRatio: 1, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1 },
  cell: { width: '33.333%', aspectRatio: 1, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  
  tokenContainer: { width: '60%', height: '60%', justifyContent: 'center', alignItems: 'center' },
  
  // New Single Bat Styles
  singleBatContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  batWrapper: { width: 16, height: '95%', alignItems: 'center', transform: [{ rotate: '45deg' }] },
  batBarrel: { width: 14, flex: 0.60, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  batHandle: { width: 5, flex: 0.35 },
  batKnob: { width: 10, flex: 0.05, borderRadius: 3 },
  
  // Existing O Styles
  ballInner: { width: '80%', height: '80%', borderRadius: 9999, borderWidth: 4, overflow: 'hidden' },
  stitchLeft: { position: 'absolute', left: '10%', top: 0, bottom: 0, width: '20%', borderRightWidth: 2, borderStyle: 'dotted' },
  stitchRight: { position: 'absolute', right: '10%', top: 0, bottom: 0, width: '20%', borderLeftWidth: 2, borderStyle: 'dotted' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  resultCard: { padding: 40, borderWidth: 2, alignItems: 'center', width: '90%' },
  resultTitle: { fontSize: 32, fontWeight: '900', marginBottom: 40, fontFamily: GLOBAL_STYLES.monospace, letterSpacing: 2 },
  resultSubtitle: { fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: GLOBAL_STYLES.monospace, marginTop: 10 },
  actionBtn: { paddingHorizontal: 40, paddingVertical: 18, marginBottom: 20 },
  actionBtnText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1, fontFamily: GLOBAL_STYLES.monospace },
  exitBtn: { padding: 10 },
});
