/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRightLeft, DollarSign, Info } from 'lucide-react';

const DEFAULT_EXCHANGE_RATE = 0.0245; // Fallback rate
const DEFAULT_USD_TO_TOMAN = 70000; // Approximate rate fallback: 1 USD = 70,000 Toman

export default function App() {
  const [activeInput, setActiveInput] = useState<'uah' | 'usd' | 'toman'>('uah');
  const [inputValue, setInputValue] = useState<string>('1000');
  
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);
  const [usdToToman, setUsdToToman] = useState<number>(DEFAULT_USD_TO_TOMAN);
  const [isLiveUah, setIsLiveUah] = useState(false);
  const [isLiveToman, setIsLiveToman] = useState(false);

  const formatWithCommas = (val: string) => {
    if (!val) return val;
    const parts = val.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const enforceTwoDecimals = (val: string) => {
    if (!val) return val;
    const match = val.match(/^-?\d*\.?\d{0,2}/);
    return match ? match[0] : val;
  };

  const enforceInteger = (val: string) => {
    if (!val) return val;
    const match = val.match(/^-?\d*/);
    return match ? match[0] : val;
  };

  const handleUahChange = (val: string) => {
    setActiveInput('uah');
    setInputValue(enforceTwoDecimals(val));
  };

  const handleUsdChange = (val: string) => {
    setActiveInput('usd');
    setInputValue(enforceTwoDecimals(val));
  };

  const handleTomanChange = (val: string) => {
    setActiveInput('toman');
    setInputValue(enforceInteger(val));
  };

  let uah = '';
  let usd = '';
  let tomanResult = '';

  const num = parseFloat(inputValue);

  if (activeInput === 'uah') {
    uah = inputValue;
    if (!isNaN(num)) {
      usd = parseFloat((num * exchangeRate).toFixed(2)).toString();
      tomanResult = Math.round(num * exchangeRate * usdToToman).toString();
    }
  } else if (activeInput === 'usd') {
    usd = inputValue;
    if (!isNaN(num)) {
      uah = parseFloat((num / exchangeRate).toFixed(2)).toString();
      tomanResult = Math.round(num * usdToToman).toString();
    }
  } else if (activeInput === 'toman') {
    tomanResult = inputValue;
    if (!isNaN(num)) {
      usd = parseFloat((num / usdToToman).toFixed(2)).toString();
      uah = parseFloat((num / (usdToToman * exchangeRate)).toFixed(2)).toString();
    }
  }

  // Fetch Live Rates
  useEffect(() => {
    async function fetchRates() {
      try {
        const response = await fetch('/api/rates');
        if (!response.ok) {
          console.warn("Backend API returned non-OK status");
          return;
        }
        const data = await response.json();
        
        if (data.uahToUsd) {
          setExchangeRate(data.uahToUsd);
          setIsLiveUah(true);
        }
        
        let fetchedToman = false;
        
        // Attempt to fulfill user's request to use Nobitex API directly from frontend
        if (data.nobitexApiKey) {
          try {
            const nobitexRes = await fetch('https://api.nobitex.ir/v2/orderbook/USDTIRT', {
              headers: {
                'Authorization': `Token ${data.nobitexApiKey}`
              }
            });
            if (nobitexRes.ok) {
              const nobitexData = await nobitexRes.json();
              if (nobitexData?.status === 'ok' && nobitexData?.lastTradePrice) {
                setUsdToToman(parseFloat(nobitexData.lastTradePrice) / 10);
                setIsLiveToman(true);
                fetchedToman = true;
              }
            }
          } catch (error) {
            // Expected to fail in non-Iran regions due to DNS/CORS blocking
            console.warn("Could not fetch Nobitex from frontend (DNS/CORS), using fallback rate.", (error as Error).message);
          }
        }
        
        // Fallback to the rate provided by our backend (via Wallex) if Nobitex is unreachable
        if (!fetchedToman && data.usdToToman) {
          setUsdToToman(data.usdToToman);
          setIsLiveToman(true);
        }
      } catch (error) {
        console.warn("Failed to fetch rates from backend:", (error as Error).message);
      }
    }

    fetchRates();
    
    // Set up polling every 60 seconds for live updates
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#1e293b] font-sans p-4 sm:p-8 flex flex-col items-center justify-center py-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-[24px] sm:rounded-[32px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] p-6 sm:p-10 space-y-6 border border-white/20"
        id="converter-card"
      >
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl mb-1 sm:mb-2">
            <ArrowRightLeft aria-hidden="true" className="w-5 h-5 sm:w-6 sm:h-6" id="header-icon" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight" id="app-title">
            Hryvnia to Toman Converter
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">Instant real-time conversion with live market rates</p>
        </header>

        {/* Live Rates Bar at the top */}
        <div className="space-y-1.5">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#64748B] tracking-[0.05em] uppercase ml-1">
            Live Exchange Rates
          </span>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-center">
            <div className="space-y-0.5 border-r border-[#E2E8F0] py-1">
              <div className="text-[9px] uppercase tracking-wider text-[#64748B] font-semibold">UAH to USD</div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-800">
                ₴1 = ${exchangeRate.toFixed(4)}
              </div>
            </div>
            <div className="space-y-0.5 border-r border-[#E2E8F0] py-1">
              <div className="text-[9px] uppercase tracking-wider text-[#64748B] font-semibold">USD to Toman</div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-800">
                $1 = {Math.round(usdToToman).toLocaleString()} T
              </div>
            </div>
            <div className="space-y-0.5 py-1">
              <div className="text-[9px] uppercase tracking-wider text-[#64748B] font-semibold">UAH to Toman</div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-800">
                ₴1 = {Math.round(exchangeRate * usdToToman).toLocaleString()} T
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 sm:space-y-6">
          {/* UAH Input */}
          <div className="relative group">
            <label className="text-[10px] sm:text-[11px] font-bold text-[#64748B] tracking-[0.05em] uppercase ml-1" htmlFor="uah-input">
              Amount in UAH
            </label>
            <div className="mt-1 relative flex items-center">
              <span className="absolute left-4 sm:left-5 text-slate-400 font-medium text-lg sm:text-xl">₴</span>
              <input
                id="uah-input"
                type="text"
                inputMode="decimal"
                name="uah"
                autoComplete="off"
                spellCheck={false}
                value={formatWithCommas(uah)}
                onChange={(e) => handleUahChange(e.target.value.replace(/,/g, ''))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl sm:rounded-2xl p-4 sm:p-5 pl-10 sm:pl-14 pr-16 text-xl sm:text-2xl font-semibold text-slate-700 tabular-nums touch-manipulation transition-colors duration-200 focus-visible:border-[#3B82F6] focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:outline-none outline-none"
                placeholder="1,000…"
              />
              <div className="absolute right-4 sm:right-5 bg-white border border-slate-200 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold text-slate-600">
                UAH
              </div>
            </div>
          </div>

          {/* Separator / Arrow */}
          <div className="flex justify-center -my-2 sm:-my-3 relative z-10">
            <div className="bg-white p-1.5 sm:p-2 rounded-full shadow-md border border-slate-100 text-blue-500">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>

          {/* USD Input */}
          <div className="relative">
            <label className="text-[10px] sm:text-[11px] font-bold text-[#64748B] tracking-[0.05em] uppercase ml-1" htmlFor="usd-input">
              Amount in USD
            </label>
            <div className="mt-1 relative flex items-center">
              <span className="absolute left-4 sm:left-5 text-blue-400 font-medium text-lg sm:text-xl">$</span>
              <input
                id="usd-input"
                type="text"
                inputMode="decimal"
                name="usd"
                autoComplete="off"
                spellCheck={false}
                value={formatWithCommas(usd)}
                onChange={(e) => handleUsdChange(e.target.value.replace(/,/g, ''))}
                className="w-full bg-blue-50/50 border border-blue-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 pl-10 sm:pl-14 pr-16 text-xl sm:text-2xl font-semibold text-blue-700 tabular-nums touch-manipulation transition-colors duration-200 focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:outline-none outline-none"
                placeholder="0.00…"
              />
              <div className="absolute right-4 sm:right-5 bg-blue-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold">
                USD
              </div>
            </div>
          </div>

          {/* Separator / Arrow 2 */}
          <div className="flex justify-center -my-2 sm:-my-3 relative z-10">
            <div className="bg-white p-1.5 sm:p-2 rounded-full shadow-md border border-slate-100 text-emerald-500">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>

          {/* Toman Input */}
          <div className="relative">
            <label className="text-[10px] sm:text-[11px] font-bold text-[#64748B] tracking-[0.05em] uppercase ml-1" htmlFor="toman-input">
              Amount in Toman
            </label>
            <div className="mt-1 relative flex items-center">
              <span className="absolute left-4 sm:left-5 text-emerald-400 font-medium text-sm sm:text-base">تومان</span>
              <input
                id="toman-input"
                type="text"
                inputMode="decimal"
                name="toman"
                autoComplete="off"
                spellCheck={false}
                value={formatWithCommas(tomanResult)}
                onChange={(e) => handleTomanChange(e.target.value.replace(/,/g, ''))}
                className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 pl-14 sm:pl-16 pr-16 text-xl sm:text-2xl font-semibold text-emerald-700 tabular-nums touch-manipulation transition-colors duration-200 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-500/10 focus-visible:outline-none outline-none"
                placeholder="0…"
              />
              <div className="absolute right-4 sm:right-5 bg-emerald-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold">
                IRT
              </div>
            </div>
          </div>
        </div>

        <footer className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 font-medium uppercase tracking-widest pt-2 gap-2 sm:gap-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLiveUah ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`}></span>
              UAH: {isLiveUah ? 'Live' : 'Approx'}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLiveToman ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`}></span>
              Toman: {isLiveToman ? 'Live' : 'Approx'}
            </div>
          </div>
          <div>Ref: NBU • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </footer>
      </motion.div>
    </div>
  );
}
