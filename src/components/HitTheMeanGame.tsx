import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, RotateCcw, X, Info, Trophy, AlertCircle, Sparkles } from 'lucide-react';

interface HitTheMeanGameProps {
  onClose: () => void;
  language: 'sv' | 'en' | 'de' | 'fr';
  isTeaserMode?: boolean;
}

const HitTheMeanGame: React.FC<HitTheMeanGameProps> = ({ onClose, language, isTeaserMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<number[]>([]);
  const [trueMean, setTrueMean] = useState(0);
  const [sigma, setSigma] = useState(1);
  const [clicked, setClicked] = useState(false);
  const [guess, setGuess] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  // State for Rounds and Scoring
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [totalError, setTotalError] = useState(0);
  const [guesses, setGuesses] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const maxRounds = 10;

  const translations = {
    sv: {
      title: "🎯 Hit the Mean",
      desc: "Klicka på linjen där du tror att medelvärdet (μ) ligger.",
      newRound: "Nästa runda",
      guess: "Din gissning",
      actual: "Riktiga μ",
      error: "Fel",
      score: "Poäng",
      close: "Stäng",
      howToPlay: "Hur man spelar",
      howToPlayDesc: "Punkterna du ser är slumpmässigt genererade från en normalfördelning. Din uppgift är att uppskatta var mitten (medelvärdet) av dessa punkter finns. Ju närmare du kommer, desto högre poäng!",
      round: "Runda",
      totalScore: "Total poäng",
      avgError: "Medelfel",
      gameOver: "Spelet slut!",
      restart: "Starta om",
      send: "Skicka resultat",
      accuracyExcellent: "Utmärkt precision!",
      accuracyGood: "Bra jobbat!",
      accuracyPoor: "Behöver mer träning",
    },
    en: {
      title: "🎯 Hit the Mean",
      desc: "Click on the line where you think the mean (μ) is located.",
      newRound: "Next Round",
      guess: "Your guess",
      actual: "Actual μ",
      error: "Error",
      score: "Score",
      close: "Close",
      howToPlay: "How to Play",
      howToPlayDesc: "The points you see are randomly generated from a normal distribution. Your task is to estimate where the center (mean) of these points is. The closer you get, the higher your score!",
      round: "Round",
      totalScore: "Total Score",
      avgError: "Avg Error",
      gameOver: "Game Over!",
      restart: "Restart",
      send: "Send Result",
      accuracyExcellent: "Excellent precision!",
      accuracyGood: "Good job!",
      accuracyPoor: "Needs more practice",
    },
    de: {
      title: "🎯 Hit the Mean",
      desc: "Klicken Sie auf die Linie, an der Sie den Mittelwert (μ) vermuten.",
      newRound: "Nächste Runde",
      guess: "Ihre Schätzung",
      actual: "Tatsächliches μ",
      error: "Fehler",
      score: "Punktzahl",
      close: "Schließen",
      howToPlay: "Spielanleitung",
      howToPlayDesc: "Die Punkte, die Sie sehen, werden zufällig aus einer Normalverteilung generiert. Ihre Aufgabe ist es, zu schätzen, wo sich die Mitte (der Mittelwert) dieser Punkte befindet. Je näher Sie kommen, desto höher ist Ihre Punktzahl!",
      round: "Runde",
      totalScore: "Gesamtpunktzahl",
      avgError: "Durchschn. Fehler",
      gameOver: "Spiel vorbei!",
      restart: "Neustart",
      send: "Ergebnis senden",
      accuracyExcellent: "Exzellente Präzision!",
      accuracyGood: "Gut gemacht!",
      accuracyPoor: "Benötigt mehr Übung",
    },
    fr: {
      title: "🎯 Hit the Mean",
      desc: "Cliquez sur la ligne où vous pensez que la moyenne (μ) se situe.",
      newRound: "Tour suivant",
      guess: "Votre estimation",
      actual: "μ réel",
      error: "Erreur",
      score: "Score",
      close: "Fermer",
      howToPlay: "Comment jouer",
      howToPlayDesc: "Les points que vous voyez sont générés aléatoirement à partir d'une distribution normale. Votre tâche est d'estimer où se trouve le centre (la moyenne) de ces points. Plus vous êtes proche, plus votre score est élevé !",
      round: "Tour",
      totalScore: "Score total",
      avgError: "Erreur moy.",
      gameOver: "Fin de partie !",
      restart: "Recommencer",
      send: "Envoyer le résultat",
      accuracyExcellent: "Excellente précision !",
      accuracyGood: "Bon travail !",
      accuracyPoor: "Nécessite plus de pratique",
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  // Normal distribution generator (Box-Muller)
  const randn = () => {
    let u = Math.random();
    let v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const generateData = useCallback(() => {
    const mean = (Math.random() * 6) - 3; // random mean between -3 and +3
    const s = 0.6 + Math.random() * 0.8;  // random sigma between 0.6 and 1.4
    
    const newData = Array.from({ length: 40 }, () => mean + randn() * s);
    
    setTrueMean(mean);
    setSigma(s);
    setData(newData);
    setClicked(false);
    setGuess(null);
    setShowResult(false);
    setScore(null);
  }, []);

  const restartGame = useCallback(() => {
    setRound(1);
    setTotalScore(0);
    setTotalError(0);
    setGuesses(0);
    setIsGameOver(false);
    generateData();
  }, [generateData]);

  useEffect(() => {
    generateData();
  }, [generateData]);

  const xScale = (x: number, width: number) => {
    return 50 + ((x + 5) / 10) * (width - 100);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw baseline
    ctx.beginPath();
    ctx.moveTo(50, height - 50);
    ctx.lineTo(width - 50, height - 50);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw scale markers
    ctx.font = "10px JetBrains Mono";
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.textAlign = "center";
    for (let i = -5; i <= 5; i++) {
      const x = xScale(i, width);
      ctx.beginPath();
      ctx.moveTo(x, height - 50);
      ctx.lineTo(x, height - 45);
      ctx.stroke();
      ctx.fillText(i.toString(), x, height - 30);
    }

    // Draw points with glow
    data.forEach(v => {
      const x = xScale(v, width);
      const y = height - 50;
      
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(59, 130, 246, 0.5)";
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // If user clicked: show true mean and guess with strong glow
    if (clicked && guess !== null) {
      // True mean (Green Glow)
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(34, 197, 94, 0.8)";
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(xScale(trueMean, width), height - 120);
      ctx.lineTo(xScale(trueMean, width), height - 20);
      ctx.stroke();

      // Guess (Red Glow)
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(239, 68, 68, 0.8)";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(xScale(guess, width), height - 120);
      ctx.lineTo(xScale(guess, width), height - 20);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    }
  }, [data, clicked, guess, trueMean]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (clicked || isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const width = canvas.width;

    // Scale back to value
    const userGuess = ((x - 50) / (width - 100)) * 10 - 5;

    setGuess(userGuess);
    setClicked(true);
    
    const error = Math.abs(userGuess - trueMean);
    const calculatedScore = Math.max(0, Math.round(100 - 20 * error));
    setScore(calculatedScore);
    
    setTotalScore(prev => prev + calculatedScore);
    setTotalError(prev => prev + error);
    setGuesses(prev => prev + 1);

    setTimeout(() => {
      setShowResult(true);
      
      // Auto-advance or end game
      setTimeout(() => {
        if (round < maxRounds) {
          setRound(prev => prev + 1);
          generateData();
        } else {
          setIsGameOver(true);
        }
      }, 1500);
    }, 500);
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`Hit the Mean Result`);
    const body = encodeURIComponent(`
Hit the Mean Result:
-------------------
Resultat:
Total poäng: ${totalScore}
Medelfel: ${avgError}
Bedömning: ${getAccuracyText()}
    `);
    
    window.location.href = `mailto:info@digicap.app?subject=${subject}&body=${body}`;
  };

  const avgError = guesses > 0 ? (totalError / guesses).toFixed(2) : "0.00";
  const avgErrorNum = parseFloat(avgError);
  
  const getAccuracyColor = () => {
    if (avgErrorNum <= 0.5) return "text-green-600";
    if (avgErrorNum <= 1.5) return "text-orange-500";
    return "text-red-600";
  };

  const getAccuracyText = () => {
    if (avgErrorNum <= 0.5) return t.accuracyExcellent;
    if (avgErrorNum <= 1.5) return t.accuracyGood;
    return t.accuracyPoor;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#0f172a] p-4 flex items-center justify-between text-white border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">DIGICAP</span>
              <span className="text-[10px] font-bold text-blue-400/80">®</span>
            </div>
            <div className="h-4 w-px bg-white/20 mx-1" />
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold tracking-tight text-slate-300 uppercase">{t.title}</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-[#0f172a]">
          {!isGameOver ? (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 p-2 rounded-xl border border-white/5 text-center backdrop-blur-sm">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t.round}</p>
                  <p className="text-sm font-mono font-bold text-slate-300">{round} / {maxRounds}</p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded-xl border border-white/5 text-center backdrop-blur-sm">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t.totalScore}</p>
                  <p className="text-sm font-mono font-bold text-blue-400">{totalScore}</p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded-xl border border-white/5 text-center backdrop-blur-sm">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t.avgError}</p>
                  <p className="text-sm font-mono font-bold text-slate-300">{avgError}</p>
                </div>
              </div>

              <div className="mb-6 text-center">
                <p className="text-slate-400 font-medium text-sm">{t.desc}</p>
              </div>

              <div className="relative bg-slate-950 rounded-2xl border border-white/10 p-4 mb-6 overflow-hidden shadow-2xl shadow-blue-900/20">
                <canvas 
                  ref={canvasRef} 
                  width={800} 
                  height={200}
                  onClick={handleCanvasClick}
                  className={`w-full h-auto cursor-crosshair touch-none ${clicked ? 'pointer-events-none' : ''}`}
                  style={{ maxWidth: '100%' }}
                />
              </div>

              <AnimatePresence>
                {showResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
                  >
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">{t.guess}</p>
                      <p className="text-lg font-mono font-bold text-red-500">{guess?.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">{t.actual}</p>
                      <p className="text-lg font-mono font-bold text-green-500">{trueMean.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-tighter">{t.error}</p>
                      <p className="text-lg font-mono font-bold text-slate-300">{Math.abs((guess || 0) - trueMean).toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-center">
                      <p className="text-[10px] text-blue-400 uppercase font-bold mb-1 tracking-tighter">{t.score}</p>
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="w-4 h-4 text-blue-400" />
                        <p className="text-lg font-mono font-bold text-blue-400">{score}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className={`inline-flex p-6 rounded-full mb-6 bg-slate-900 border border-white/10 ${getAccuracyColor()}`}>
                <Trophy className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-white mb-2 tracking-tight">{t.gameOver}</h3>
              <p className={`text-sm font-bold uppercase tracking-[0.2em] mb-8 ${getAccuracyColor()}`}>
                {getAccuracyText()}
              </p>
              
              <div className={`grid grid-cols-2 gap-6 max-w-sm mx-auto mb-10 p-6 rounded-3xl border bg-slate-900/50 backdrop-blur-xl border-white/10`}>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-widest">{t.totalScore}</p>
                  <p className={`text-3xl font-mono font-black ${getAccuracyColor()}`}>{totalScore}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-widest">{t.avgError}</p>
                  <p className={`text-3xl font-mono font-black ${getAccuracyColor()}`}>{avgError}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <button 
                  onClick={handleSendEmail}
                  className="flex items-center justify-center gap-2 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-900/40 group"
                >
                  <Target className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  {t.send}
                </button>
                <button 
                  onClick={restartGame}
                  className="flex items-center justify-center gap-2 px-10 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-black/40 group"
                >
                  <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  {t.restart}
                </button>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={onClose}
                  className="px-10 py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl font-bold transition-all border border-white/5"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          )}

          {!isGameOver && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={restartGame}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl font-bold transition-all border border-white/5"
              >
                <RotateCcw className="w-4 h-4" />
                {t.restart}
              </button>
              <button 
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl font-bold transition-all border border-white/5"
              >
                {t.close}
              </button>
            </div>
          )}

          {/* How to play section */}
          <div className="mt-8 pt-8 border-t border-white/5">
            {isTeaserMode && (
              <div className="mb-6 p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl border border-blue-400/30 shadow-lg shadow-blue-900/20">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                    <Sparkles className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-lg tracking-tight uppercase">DIGICAP kommer snart!</h4>
                    <p className="text-blue-100 text-sm font-medium">Detta spel är bara en teaser. Håll utkik efter den fullständiga appen för professionell SPC-analys.</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-start gap-4 bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-blue-300 text-sm mb-1 uppercase tracking-wider">{t.howToPlay}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {t.howToPlayDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HitTheMeanGame;
