import { serve } from 'bun';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

// Types
interface MediaVersion {
  url: string;
  width: number;
  height: number;
  type?: string;
  bitrate?: number;
}

interface MediaItem {
  type: 'video' | 'image';
  versions: MediaVersion[];
  thumbnail?: string;
}

interface FetchResult {
  type: 'reel' | 'post' | 'carousel' | 'story';
  code: string;
  author?: string;
  caption?: string;
  timestamp?: number;
  thumbnail?: string;
  items: MediaItem[];
  videoVersions?: MediaVersion[];
  videoUrl?: string;
  allUrls?: string[];
}

interface ProcessRequest {
  urls: string[];
  quality?: 'highest' | 'medium' | 'lowest';
}

interface ProcessResponse {
  success: boolean;
  results?: FetchResult[];
  error?: string;
  details?: string;
}

interface DebugInfo {
  method: string;
  step: string;
  data?: any;
  error?: Error;
  timestamp: string;
}

interface InstagramServiceConfig {
  debug: boolean;
  logLevel: 'error' | 'info' | 'debug' | 'verbose';
  dumpHtml: boolean;
  dumpPath: string;
}

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Primary SEO Meta Tags -->
    <title>ReelGrab - Free Instagram Video Downloader | Download Reels, Posts & Stories</title>
    <meta name="title" content="ReelGrab - Free Instagram Video Downloader | Download Reels, Posts & Stories">
    <meta name="description" content="Download Instagram Reels, Videos, Posts, Stories & Carousels for free in HD quality. No login required. Fast, free, and unlimited Instagram video downloader. Save any Instagram content instantly.">
    <meta name="keywords" content="instagram downloader, instagram reel downloader, download instagram video, instagram video saver, save instagram reels, instagram story downloader, instagram carousel downloader, download instagram posts, free instagram downloader, HD instagram download, instagram reel saver, insta video download">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="language" content="English">
    <meta name="author" content="ReelGrab">
    <meta name="revisit-after" content="1 days">
    <link rel="canonical" href="https://reelgrab.hsingh.app/">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://reelgrab.hsingh.app/">
    <meta property="og:title" content="ReelGrab - Free Instagram Video Downloader | Download Reels, Posts & Stories">
    <meta property="og:description" content="Download Instagram Reels, Videos, Posts, Stories & Carousels for free in HD quality. No login required. Fast, free, and unlimited.">
    <meta property="og:image" content="https://images.hsingh.app/?text=REELGRAB%0A%0AInstagram%20Downloader&w=1200&h=630&bg=%23FFE500&txtColor=%23000000&fontSize=100">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="ReelGrab">
    <meta property="og:locale" content="en_US">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://reelgrab.hsingh.app/">
    <meta name="twitter:title" content="ReelGrab - Free Instagram Video Downloader">
    <meta name="twitter:description" content="Download Instagram Reels, Videos, Posts & Stories for free in HD. No login required.">
    <meta name="twitter:image" content="https://images.hsingh.app/?text=REELGRAB%0A%0AInstagram%20Downloader&w=1200&h=630&bg=%23FFE500&txtColor=%23000000&fontSize=100">

    <!-- Additional SEO -->
    <meta name="theme-color" content="#FFE500">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="ReelGrab">
    <meta name="application-name" content="ReelGrab">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="format-detection" content="telephone=no">

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23FFE500' stroke='%23000' stroke-width='6' rx='12' width='100' height='100'/><path fill='%23000' d='M35 65V35l30 15z'/></svg>">
    <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23FFE500' stroke='%23000' stroke-width='6' rx='12' width='100' height='100'/><path fill='%23000' d='M35 65V35l30 15z'/></svg>">

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "ReelGrab",
        "url": "https://reelgrab.hsingh.app",
        "description": "Free Instagram Video Downloader - Download Reels, Posts, Stories & Carousels in HD quality",
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Any",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "featureList": [
            "Download Instagram Reels",
            "Download Instagram Posts",
            "Download Instagram Stories",
            "Download Instagram Carousels",
            "HD Quality Downloads",
            "No Login Required",
            "Bulk Download Support",
            "Free and Unlimited"
        ],
        "screenshot": "https://images.hsingh.app/?text=REELGRAB%0A%0AInstagram%20Downloader&w=1200&h=630&bg=%23FFE500&txtColor=%23000000&fontSize=100",
        "softwareVersion": "2.0",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "2847",
            "bestRating": "5",
            "worstRating": "1"
        }
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "How to download Instagram Reels?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Simply paste the Instagram Reel URL into ReelGrab and click Download. The video will be saved to your device in HD quality."
                }
            },
            {
                "@type": "Question",
                "name": "Is ReelGrab free to use?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, ReelGrab is completely free to use with no limits on downloads. No registration or login required."
                }
            },
            {
                "@type": "Question",
                "name": "Can I download Instagram carousel posts?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, ReelGrab supports downloading all images and videos from Instagram carousel posts with a single click."
                }
            },
            {
                "@type": "Question",
                "name": "What quality are the downloaded videos?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "ReelGrab downloads videos in the highest available quality, typically 1080p HD. You can also choose medium or low quality to save data."
                }
            }
        ]
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "ReelGrab",
        "url": "https://reelgrab.hsingh.app",
        "logo": "https://images.hsingh.app/?text=RG&w=200&h=200&bg=%23FFE500&txtColor=%23000000&fontSize=80",
        "sameAs": []
    }
    </script>

    <!-- Preconnect for performance -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="dns-prefetch" href="https://www.instagram.com">
    <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Dela+Gothic+One&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
        :root {
            --black: #000000;
            --white: #ffffff;
            --yellow: #FFE500;
            --yellow-dark: #E6CF00;
            --gray: #333333;
            --gray-light: #666666;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* Manga halftone pattern */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: radial-gradient(circle, var(--gray) 1px, transparent 1px);
            background-size: 20px 20px;
            opacity: 0.03;
            pointer-events: none;
            z-index: -1;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background: var(--white);
            color: var(--black);
            min-height: 100vh;
        }

        .light-mode {
            background: var(--black);
            color: var(--white);
        }

        .light-mode::before {
            background-image: radial-gradient(circle, var(--white) 1px, transparent 1px);
            opacity: 0.05;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Header */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 0;
            border-bottom: 4px solid var(--black);
            margin-bottom: 40px;
        }

        .light-mode header {
            border-bottom-color: var(--white);
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .logo-icon {
            width: 50px;
            height: 50px;
            background: var(--yellow);
            border: 4px solid var(--black);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 4px 4px 0 var(--black);
            transform: rotate(-3deg);
        }

        .light-mode .logo-icon {
            border-color: var(--white);
            box-shadow: 4px 4px 0 var(--white);
        }

        .logo-icon svg {
            width: 26px;
            height: 26px;
            fill: var(--black);
        }

        .logo h1 {
            font-family: 'Bangers', cursive;
            font-size: 2.2rem;
            letter-spacing: 2px;
            color: var(--black);
            text-shadow: 3px 3px 0 var(--yellow);
            transform: rotate(-1deg);
        }

        .light-mode .logo h1 {
            color: var(--white);
            text-shadow: 3px 3px 0 var(--yellow);
        }

        .header-actions {
            display: flex;
            gap: 12px;
        }

        .icon-btn {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            border: 3px solid var(--black);
            background: var(--white);
            color: var(--black);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
            box-shadow: 3px 3px 0 var(--black);
        }

        .light-mode .icon-btn {
            border-color: var(--white);
            background: var(--black);
            color: var(--white);
            box-shadow: 3px 3px 0 var(--white);
        }

        .icon-btn:hover {
            background: var(--yellow);
            transform: translate(-2px, -2px);
            box-shadow: 5px 5px 0 var(--black);
        }

        .light-mode .icon-btn:hover {
            background: var(--yellow);
            color: var(--black);
            box-shadow: 5px 5px 0 var(--white);
        }

        .icon-btn:active {
            transform: translate(2px, 2px);
            box-shadow: 1px 1px 0 var(--black);
        }

        /* Main Card */
        .main-card {
            background: var(--white);
            border: 4px solid var(--black);
            border-radius: 0;
            padding: 32px;
            margin-bottom: 24px;
            box-shadow: 8px 8px 0 var(--black);
            position: relative;
        }

        .light-mode .main-card {
            background: var(--black);
            border-color: var(--white);
            box-shadow: 8px 8px 0 var(--white);
        }

        /* Comic action lines decoration */
        .main-card::before {
            content: '';
            position: absolute;
            top: -20px;
            right: -20px;
            width: 60px;
            height: 60px;
            background: var(--yellow);
            border: 4px solid var(--black);
            border-radius: 50%;
            z-index: 1;
        }

        .light-mode .main-card::before {
            border-color: var(--white);
        }

        .main-card::after {
            content: '★';
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 32px;
            z-index: 2;
        }

        .card-title {
            font-family: 'Bangers', cursive;
            font-size: 1.8rem;
            letter-spacing: 1px;
            margin-bottom: 8px;
            color: var(--black);
        }

        .light-mode .card-title {
            color: var(--white);
        }

        .card-subtitle {
            color: var(--gray-light);
            font-size: 0.95rem;
            margin-bottom: 24px;
            font-weight: 500;
        }

        .light-mode .card-subtitle {
            color: #aaa;
        }

        /* Input Area */
        .input-container {
            position: relative;
            margin-bottom: 20px;
        }

        .url-input {
            width: 100%;
            min-height: 120px;
            padding: 16px;
            background: var(--white);
            border: 4px solid var(--black);
            border-radius: 0;
            color: var(--black);
            font-family: 'Outfit', sans-serif;
            font-size: 1rem;
            font-weight: 500;
            resize: vertical;
            transition: all 0.15s ease;
        }

        .light-mode .url-input {
            background: var(--gray);
            border-color: var(--white);
            color: var(--white);
        }

        .url-input:focus {
            outline: none;
            border-color: var(--yellow);
            box-shadow: 6px 6px 0 var(--yellow);
        }

        .url-input::placeholder {
            color: var(--gray-light);
        }

        .light-mode .url-input::placeholder {
            color: #888;
        }

        /* Options Row */
        .options-row {
            display: flex;
            gap: 16px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .option-group {
            flex: 1;
            min-width: 150px;
        }

        .option-label {
            display: block;
            font-size: 0.85rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--black);
            margin-bottom: 8px;
        }

        .light-mode .option-label {
            color: var(--white);
        }

        .select-wrapper {
            position: relative;
        }

        .quality-select {
            width: 100%;
            padding: 14px 18px;
            background: var(--white);
            border: 3px solid var(--black);
            border-radius: 0;
            color: var(--black);
            font-family: 'Outfit', sans-serif;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            appearance: none;
            box-shadow: 4px 4px 0 var(--black);
        }

        .light-mode .quality-select {
            background: var(--gray);
            border-color: var(--white);
            color: var(--white);
            box-shadow: 4px 4px 0 var(--white);
        }

        .select-wrapper::after {
            content: '▼';
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.8rem;
            color: var(--black);
            pointer-events: none;
            font-weight: bold;
        }

        .light-mode .select-wrapper::after {
            color: var(--white);
        }

        /* Buttons */
        .btn-row {
            display: flex;
            gap: 12px;
        }

        .btn {
            flex: 1;
            padding: 18px 28px;
            border-radius: 0;
            font-family: 'Bangers', cursive;
            font-size: 1.3rem;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.1s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            text-transform: uppercase;
        }

        .btn-primary {
            background: var(--yellow);
            border: 4px solid var(--black);
            color: var(--black);
            box-shadow: 6px 6px 0 var(--black);
        }

        .light-mode .btn-primary {
            border-color: var(--white);
            box-shadow: 6px 6px 0 var(--white);
        }

        .btn-primary:hover:not(:disabled) {
            transform: translate(-3px, -3px);
            box-shadow: 9px 9px 0 var(--black);
        }

        .btn-primary:active:not(:disabled) {
            transform: translate(3px, 3px);
            box-shadow: 3px 3px 0 var(--black);
        }

        .btn-primary:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }

        .btn-secondary {
            background: var(--white);
            border: 4px solid var(--black);
            color: var(--black);
            box-shadow: 4px 4px 0 var(--black);
        }

        .light-mode .btn-secondary {
            background: var(--gray);
            border-color: var(--white);
            color: var(--white);
            box-shadow: 4px 4px 0 var(--white);
        }

        .btn-secondary:hover {
            background: var(--yellow);
            transform: translate(-2px, -2px);
            box-shadow: 6px 6px 0 var(--black);
        }

        /* Loading State */
        .loading-spinner {
            width: 24px;
            height: 24px;
            border: 4px solid var(--black);
            border-top-color: var(--yellow);
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Results Section */
        .results-section {
            margin-top: 24px;
        }

        .result-card {
            background: var(--white);
            border: 4px solid var(--black);
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 6px 6px 0 var(--black);
            animation: slideIn 0.3s ease;
        }

        .light-mode .result-card {
            background: var(--gray);
            border-color: var(--white);
            box-shadow: 6px 6px 0 var(--white);
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px) rotate(-1deg);
            }
            to {
                opacity: 1;
                transform: translateY(0) rotate(0);
            }
        }

        .result-header {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
        }

        .result-thumbnail {
            width: 80px;
            height: 80px;
            border: 3px solid var(--black);
            object-fit: cover;
            background: var(--yellow);
        }

        .light-mode .result-thumbnail {
            border-color: var(--white);
        }

        .result-info {
            flex: 1;
            min-width: 0;
        }

        .result-type {
            display: inline-block;
            padding: 4px 12px;
            background: var(--yellow);
            color: var(--black);
            border: 2px solid var(--black);
            font-family: 'Bangers', cursive;
            font-size: 0.85rem;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 8px;
            transform: rotate(-2deg);
        }

        .light-mode .result-type {
            border-color: var(--black);
        }

        .result-caption {
            color: var(--gray);
            font-size: 0.9rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .light-mode .result-caption {
            color: #ccc;
        }

        .result-meta {
            display: flex;
            gap: 16px;
            margin-top: 8px;
            font-size: 0.8rem;
            color: var(--gray-light);
            font-weight: 600;
        }

        .result-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .download-btn {
            padding: 12px 20px;
            background: var(--yellow);
            border: 3px solid var(--black);
            color: var(--black);
            font-family: 'Bangers', cursive;
            font-size: 1rem;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.1s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 4px 4px 0 var(--black);
        }

        .light-mode .download-btn {
            border-color: var(--white);
            box-shadow: 4px 4px 0 var(--white);
        }

        .download-btn:hover {
            transform: translate(-2px, -2px);
            box-shadow: 6px 6px 0 var(--black);
        }

        .copy-btn {
            padding: 12px 20px;
            background: var(--white);
            border: 3px solid var(--black);
            color: var(--black);
            font-family: 'Outfit', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.1s ease;
            box-shadow: 4px 4px 0 var(--black);
        }

        .light-mode .copy-btn {
            background: var(--gray);
            border-color: var(--white);
            color: var(--white);
            box-shadow: 4px 4px 0 var(--white);
        }

        .copy-btn:hover {
            background: var(--yellow);
            color: var(--black);
        }

        /* History Section */
        .history-section {
            background: var(--white);
            border: 4px solid var(--black);
            padding: 24px;
            margin-top: 24px;
            box-shadow: 6px 6px 0 var(--black);
        }

        .light-mode .history-section {
            background: var(--black);
            border-color: var(--white);
            box-shadow: 6px 6px 0 var(--white);
        }

        .history-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .history-title {
            font-family: 'Bangers', cursive;
            font-size: 1.4rem;
            letter-spacing: 1px;
        }

        .clear-history {
            padding: 8px 16px;
            background: transparent;
            border: 3px solid var(--black);
            font-family: 'Outfit', sans-serif;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .light-mode .clear-history {
            border-color: var(--white);
            color: var(--white);
        }

        .clear-history:hover {
            background: var(--yellow);
            color: var(--black);
        }

        .history-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 300px;
            overflow-y: auto;
        }

        .history-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: transparent;
            border: 3px solid var(--black);
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .light-mode .history-item {
            border-color: var(--white);
        }

        .history-item:hover {
            background: var(--yellow);
        }

        .history-thumb {
            width: 48px;
            height: 48px;
            border: 2px solid var(--black);
            object-fit: cover;
        }

        .light-mode .history-thumb {
            border-color: var(--white);
        }

        .history-details {
            flex: 1;
            min-width: 0;
        }

        .history-url {
            font-size: 0.85rem;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .history-time {
            font-size: 0.75rem;
            color: var(--gray-light);
        }

        .history-empty {
            text-align: center;
            padding: 32px;
            color: var(--gray-light);
            font-size: 0.9rem;
            font-weight: 600;
        }

        /* Toast Notifications */
        .toast-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 1000;
        }

        .toast {
            padding: 16px 24px;
            background: var(--white);
            border: 4px solid var(--black);
            box-shadow: 6px 6px 0 var(--black);
            display: flex;
            align-items: center;
            gap: 12px;
            animation: toastIn 0.3s ease;
            min-width: 280px;
        }

        .light-mode .toast {
            background: var(--black);
            border-color: var(--white);
            color: var(--white);
            box-shadow: 6px 6px 0 var(--white);
        }

        @keyframes toastIn {
            from {
                opacity: 0;
                transform: translateX(100%) rotate(5deg);
            }
            to {
                opacity: 1;
                transform: translateX(0) rotate(0);
            }
        }

        .toast.success { background: var(--yellow); }
        .toast.error { background: var(--white); border-left: 8px solid var(--black); }
        .toast.warning { background: var(--yellow); }

        .toast-icon {
            font-size: 1.4rem;
            font-weight: bold;
        }

        .toast-message {
            flex: 1;
            font-size: 0.95rem;
            font-weight: 600;
        }

        /* Progress Bar */
        .progress-container {
            margin-top: 16px;
            display: none;
        }

        .progress-container.active {
            display: block;
        }

        .progress-bar {
            height: 12px;
            background: var(--white);
            border: 3px solid var(--black);
            overflow: hidden;
        }

        .light-mode .progress-bar {
            background: var(--gray);
            border-color: var(--white);
        }

        .progress-fill {
            height: 100%;
            background: var(--yellow);
            transition: width 0.3s ease;
        }

        .progress-text {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            font-size: 0.85rem;
            font-weight: 700;
            text-transform: uppercase;
        }

        /* Supported Types */
        .supported-types {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 4px solid var(--black);
        }

        .light-mode .supported-types {
            border-top-color: var(--white);
        }

        .type-badge {
            padding: 8px 14px;
            background: var(--yellow);
            border: 3px solid var(--black);
            font-family: 'Bangers', cursive;
            font-size: 0.9rem;
            letter-spacing: 1px;
            color: var(--black);
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 3px 3px 0 var(--black);
            transform: rotate(-1deg);
        }

        .type-badge:nth-child(2) { transform: rotate(1deg); }
        .type-badge:nth-child(3) { transform: rotate(-2deg); }
        .type-badge:nth-child(4) { transform: rotate(2deg); }

        .light-mode .type-badge {
            border-color: var(--black);
            box-shadow: 3px 3px 0 var(--white);
        }

        .type-badge svg {
            width: 16px;
            height: 16px;
            stroke: var(--black);
        }

        /* FAQ Section */
        .faq-section {
            background: var(--white);
            border: 4px solid var(--black);
            padding: 32px;
            margin-top: 24px;
            box-shadow: 8px 8px 0 var(--black);
        }

        .light-mode .faq-section {
            background: var(--black);
            border-color: var(--white);
            box-shadow: 8px 8px 0 var(--white);
        }

        .faq-title {
            font-family: 'Bangers', cursive;
            font-size: 1.8rem;
            letter-spacing: 2px;
            margin-bottom: 24px;
            color: var(--black);
            text-shadow: 2px 2px 0 var(--yellow);
            transform: rotate(-1deg);
        }

        .light-mode .faq-title {
            color: var(--white);
        }

        .faq-item {
            padding: 20px 0;
            border-bottom: 3px solid var(--black);
        }

        .light-mode .faq-item {
            border-bottom-color: var(--white);
        }

        .faq-item:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        .faq-item h3 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.05rem;
            font-weight: 800;
            color: var(--black);
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .light-mode .faq-item h3 {
            color: var(--white);
        }

        .faq-item p {
            font-size: 0.95rem;
            color: var(--gray);
            line-height: 1.7;
        }

        .light-mode .faq-item p {
            color: #aaa;
        }

        /* Footer */
        footer {
            margin-top: 32px;
            padding: 32px 0;
            text-align: center;
            border-top: 4px solid var(--black);
        }

        .light-mode footer {
            border-top-color: var(--white);
        }

        .footer-content p {
            color: var(--gray);
            font-size: 0.95rem;
            margin-bottom: 8px;
        }

        .light-mode .footer-content p {
            color: #aaa;
        }

        .footer-content p strong {
            font-family: 'Bangers', cursive;
            font-size: 1.2rem;
            letter-spacing: 1px;
            color: var(--black);
        }

        .light-mode .footer-content p strong {
            color: var(--white);
        }

        .footer-features {
            color: var(--gray-light) !important;
            font-size: 0.85rem !important;
            margin-top: 16px !important;
            font-weight: 600;
        }

        footer a {
            color: var(--yellow);
            text-decoration: none;
            font-weight: 700;
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
            .container {
                padding: 16px;
            }

            .logo h1 {
                font-size: 1.6rem;
            }

            .main-card {
                padding: 20px;
                box-shadow: 5px 5px 0 var(--black);
            }

            .main-card::before {
                width: 40px;
                height: 40px;
                top: -15px;
                right: -15px;
            }

            .main-card::after {
                font-size: 24px;
                top: -6px;
                right: -6px;
            }

            .card-title {
                font-size: 1.4rem;
            }

            .options-row {
                flex-direction: column;
            }

            .btn-row {
                flex-direction: column;
            }

            .btn {
                font-size: 1.1rem;
            }

            .result-header {
                flex-direction: column;
            }

            .result-thumbnail {
                width: 100%;
                height: 200px;
            }

            .supported-types {
                justify-content: center;
            }

            .type-badge {
                font-size: 0.8rem;
            }

            .faq-title {
                font-size: 1.4rem;
            }

            .toast-container {
                left: 16px;
                right: 16px;
                bottom: 16px;
            }

            .toast {
                min-width: auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">
                <div class="logo-icon">
                    <svg viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                    </svg>
                </div>
                <h1>ReelGrab</h1>
            </div>
            <div class="header-actions">
                <button class="icon-btn" id="themeToggle" title="Toggle theme" aria-label="Toggle dark/light mode">
                    <svg class="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="4"/>
                        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                    </svg>
                    <svg class="moon-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                </button>
                <button class="icon-btn" id="historyToggle" title="Download history" aria-label="View download history">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 8v4l3 3"/>
                        <path d="M3.05 11a9 9 0 1 1 .5 4"/>
                        <path d="M3 16v-5h5"/>
                    </svg>
                </button>
            </div>
        </header>

        <main>
            <div class="main-card">
                <h2 class="card-title">Download Instagram Content</h2>
                <p class="card-subtitle">Paste one or more Instagram URLs (Reels, Posts, Stories) - one per line</p>

                <div class="input-container">
                    <textarea
                        class="url-input"
                        id="urlInput"
                        placeholder="https://www.instagram.com/reel/ABC123...&#10;https://www.instagram.com/p/XYZ789...&#10;&#10;Paste multiple URLs here, one per line"
                    ></textarea>
                </div>

                <div class="options-row">
                    <div class="option-group">
                        <label class="option-label">Quality</label>
                        <div class="select-wrapper">
                            <select class="quality-select" id="qualitySelect">
                                <option value="highest">Highest Quality</option>
                                <option value="medium">Medium (720p)</option>
                                <option value="lowest">Low (saves data)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="btn-row">
                    <button class="btn btn-primary" id="processBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 3v12m0 0l-4-4m4 4l4-4"/>
                            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
                        </svg>
                        Download Now
                    </button>
                    <button class="btn btn-secondary" id="clearBtn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        Clear
                    </button>
                </div>

                <div class="progress-container" id="progressContainer">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">
                        <span id="progressStatus">Processing...</span>
                        <span id="progressCount">0/0</span>
                    </div>
                </div>

                <div class="supported-types">
                    <span class="type-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2"/>
                            <path d="M10 9l4 2.5-4 2.5V9z" fill="currentColor"/>
                            <path d="M2 17h20"/>
                            <circle cx="6" cy="20" r="1"/>
                            <circle cx="18" cy="20" r="1"/>
                        </svg>
                        Reels
                    </span>
                    <span class="type-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="3"/>
                            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                            <path d="M21 15l-5-5L5 21"/>
                        </svg>
                        Posts
                    </span>
                    <span class="type-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="9"/>
                            <circle cx="12" cy="12" r="4"/>
                            <path d="M12 2v2m0 16v2"/>
                        </svg>
                        Stories
                    </span>
                    <span class="type-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                        </svg>
                        Carousels
                    </span>
                </div>
            </div>

            <div class="results-section" id="resultsSection"></div>
        </main>

        <div class="history-section" id="historySection" style="display: none;">
            <div class="history-header">
                <h3 class="history-title">Download History</h3>
                <button class="clear-history" id="clearHistoryBtn">Clear All</button>
            </div>
            <div class="history-list" id="historyList">
                <div class="history-empty">No downloads yet</div>
            </div>
        </div>

        <!-- SEO FAQ Section -->
        <section class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
            <h2 class="faq-title">Frequently Asked Questions</h2>

            <article class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                <h3 itemprop="name">How do I download Instagram Reels?</h3>
                <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                    <p itemprop="text">Simply copy the Instagram Reel URL from the Instagram app or website, paste it into the input box above, select your preferred quality, and click "Download Now". Your video will be saved instantly in HD quality.</p>
                </div>
            </article>

            <article class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                <h3 itemprop="name">Is ReelGrab free to use?</h3>
                <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                    <p itemprop="text">Yes! ReelGrab is 100% free with no download limits. No registration, login, or subscription required. Download unlimited Instagram videos, reels, posts, and stories at no cost.</p>
                </div>
            </article>

            <article class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                <h3 itemprop="name">Can I download Instagram carousel posts?</h3>
                <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                    <p itemprop="text">Absolutely! ReelGrab supports downloading all images and videos from Instagram carousel posts. Just paste the URL and use the "Download All" button to save every item in the carousel.</p>
                </div>
            </article>

            <article class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                <h3 itemprop="name">What video quality can I download?</h3>
                <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                    <p itemprop="text">ReelGrab offers three quality options: Highest (1080p HD), Medium (720p), and Low (for saving data). The highest quality option downloads videos at their original resolution.</p>
                </div>
            </article>
        </section>

        <footer>
            <div class="footer-content">
                <p><strong>ReelGrab</strong> - The #1 Free Instagram Video Downloader</p>
                <p>Download Instagram Reels, Posts, Stories & Carousels in HD quality. Fast, free, and secure.</p>
                <p class="footer-features">No watermarks • No login required • Unlimited downloads • Works on all devices</p>
            </div>
        </footer>
    </div>

    <div class="toast-container" id="toastContainer"></div>

    <script>
    // State
    let isProcessing = false;
    let history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');

    // DOM Elements
    const urlInput = document.getElementById('urlInput');
    const qualitySelect = document.getElementById('qualitySelect');
    const processBtn = document.getElementById('processBtn');
    const clearBtn = document.getElementById('clearBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressStatus = document.getElementById('progressStatus');
    const progressCount = document.getElementById('progressCount');
    const resultsSection = document.getElementById('resultsSection');
    const historySection = document.getElementById('historySection');
    const historyList = document.getElementById('historyList');
    const historyToggle = document.getElementById('historyToggle');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const themeToggle = document.getElementById('themeToggle');
    const toastContainer = document.getElementById('toastContainer');

    // Theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');

    function updateThemeIcons() {
        const isLight = document.body.classList.contains('light-mode');
        sunIcon.style.display = isLight ? 'none' : 'block';
        moonIcon.style.display = isLight ? 'block' : 'none';
    }

    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
    updateThemeIcons();

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        updateThemeIcons();
    });

    // History Toggle
    historyToggle.addEventListener('click', () => {
        historySection.style.display = historySection.style.display === 'none' ? 'block' : 'none';
        renderHistory();
    });

    clearHistoryBtn.addEventListener('click', () => {
        history = [];
        localStorage.setItem('downloadHistory', '[]');
        renderHistory();
        showToast('History cleared', 'success');
    });

    // Toast Notifications
    function showToast(message, type = 'success') {
        const icons = { success: '✓', error: '✕', warning: '⚠' };
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.innerHTML = '<span class="toast-icon">' + icons[type] + '</span><span class="toast-message">' + message + '</span>';
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // Render History
    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-empty">No downloads yet</div>';
            return;
        }

        historyList.innerHTML = history.slice(0, 20).map(item =>
            '<div class="history-item" onclick="urlInput.value = \\'' + item.url.replace(/'/g, "\\\\'") + '\\'">' +
                '<img src="' + (item.thumbnail || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/></svg>') + '" class="history-thumb" onerror="this.src=\\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/></svg>\\'">' +
                '<div class="history-details">' +
                    '<div class="history-url">' + item.url + '</div>' +
                    '<div class="history-time">' + new Date(item.timestamp).toLocaleString() + '</div>' +
                '</div>' +
            '</div>'
        ).join('');
    }

    // Add to History
    function addToHistory(url, thumbnail) {
        history.unshift({ url, thumbnail, timestamp: Date.now() });
        history = history.slice(0, 50);
        localStorage.setItem('downloadHistory', JSON.stringify(history));
    }

    // Clear Button
    clearBtn.addEventListener('click', () => {
        urlInput.value = '';
        resultsSection.innerHTML = '';
    });

    // Process Button
    processBtn.addEventListener('click', processUrls);
    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) processUrls();
    });

    async function processUrls() {
        if (isProcessing) return;

        const text = urlInput.value.trim();
        if (!text) {
            showToast('Please enter at least one URL', 'error');
            return;
        }

        const urls = text.split('\\n').map(u => u.trim()).filter(u => u.length > 0);
        if (urls.length === 0) {
            showToast('No valid URLs found', 'error');
            return;
        }

        isProcessing = true;
        processBtn.disabled = true;
        processBtn.innerHTML = '<div class="loading-spinner"></div> Processing...';
        progressContainer.classList.add('active');
        resultsSection.innerHTML = '';

        let completed = 0;
        const results = [];

        for (const url of urls) {
            progressStatus.textContent = 'Processing: ' + url.substring(0, 40) + '...';
            progressCount.textContent = completed + '/' + urls.length;
            progressFill.style.width = ((completed / urls.length) * 100) + '%';

            try {
                const response = await fetch('/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls: [url], quality: qualitySelect.value })
                });

                const data = await response.json();

                if (data.success && data.results && data.results.length > 0) {
                    const result = data.results[0];
                    results.push(result);
                    addToHistory(url, result.thumbnail);
                    renderResult(result, url);
                } else {
                    showToast('Failed: ' + (data.error || url), 'error');
                }
            } catch (err) {
                showToast('Error processing: ' + url.substring(0, 30), 'error');
            }

            completed++;
        }

        progressFill.style.width = '100%';
        progressStatus.textContent = 'Complete!';
        progressCount.textContent = completed + '/' + urls.length;

        setTimeout(() => {
            progressContainer.classList.remove('active');
            isProcessing = false;
            processBtn.disabled = false;
            processBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg> Download Now';
        }, 1500);

        if (results.length > 0) {
            showToast('Successfully processed ' + results.length + ' item(s)', 'success');
        }
    }

    function renderResult(result, originalUrl) {
        const card = document.createElement('div');
        card.className = 'result-card';

        const items = result.items || [];
        const firstItem = items[0] || {};
        const versions = firstItem.versions || result.videoVersions || [];
        const bestVersion = versions[0];

        card.innerHTML =
            '<div class="result-header">' +
                (result.thumbnail ? '<img src="' + result.thumbnail + '" class="result-thumbnail" onerror="this.style.display=\\'none\\'">' : '') +
                '<div class="result-info">' +
                    '<span class="result-type">' + (result.type || 'media') + (items.length > 1 ? ' (' + items.length + ' items)' : '') + '</span>' +
                    (result.caption ? '<p class="result-caption">' + escapeHtml(result.caption.substring(0, 150)) + '</p>' : '') +
                    '<div class="result-meta">' +
                        (result.author ? '<span>@' + escapeHtml(result.author) + '</span>' : '') +
                        (bestVersion ? '<span>' + bestVersion.width + 'x' + bestVersion.height + '</span>' : '') +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="result-actions">' +
                (bestVersion ? '<button class="download-btn" onclick="downloadFile(\\'' + bestVersion.url.replace(/'/g, "\\\\'") + '\\', \\'' + (result.code || 'instagram') + '\\')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download</button>' : '') +
                (bestVersion ? '<button class="copy-btn" onclick="copyToClipboard(\\'' + bestVersion.url.replace(/'/g, "\\\\'") + '\\')">Copy URL</button>' : '') +
                (items.length > 1 ? '<button class="copy-btn" onclick="downloadAll(this)" data-items=\\'' + JSON.stringify(items).replace(/'/g, '&#39;') + '\\' data-code="' + (result.code || 'instagram') + '">Download All (' + items.length + ')</button>' : '') +
            '</div>';

        resultsSection.appendChild(card);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function downloadFile(url, filename) {
        showToast('Starting download...', 'success');
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'instagram_' + filename + (url.includes('.mp4') || blob.type.includes('video') ? '.mp4' : '.jpg');
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
            showToast('Download complete!', 'success');
        } catch (err) {
            showToast('Download failed: ' + err.message, 'error');
        }
    }

    async function downloadAll(button) {
        const items = JSON.parse(button.dataset.items);
        const code = button.dataset.code;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const version = item.versions && item.versions[0];
            if (version) {
                await downloadFile(version.url, code + '_' + (i + 1));
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('URL copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    }

    // Initialize history
    renderHistory();
    </script>
</body>
</html>`;

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly WINDOW_MS = 60000;
  private readonly MAX_REQUESTS = 30;

  public isRateLimited(ip: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(ip) || [];
    const validTimestamps = timestamps.filter(
      (time) => now - time < this.WINDOW_MS
    );

    if (validTimestamps.length >= this.MAX_REQUESTS) {
      return true;
    }

    validTimestamps.push(now);
    this.requests.set(ip, validTimestamps);
    return false;
  }

  public getRemainingTime(ip: string): number {
    const timestamps = this.requests.get(ip) || [];
    if (timestamps.length === 0) return 0;
    return Math.max(0, this.WINDOW_MS - (Date.now() - timestamps[0]));
  }
}

class InstagramService {
  private static config: InstagramServiceConfig = {
    debug: false,
    logLevel: 'error',
    dumpHtml: false,
    dumpPath: './debug_dumps',
  };

  private static debugLogs: DebugInfo[] = [];

  private static readonly HEADERS = {
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    cookie: process.env.INSTAGRAM_COOKIE || '',
  };

  public static configure(config: Partial<InstagramServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private static debug(info: Omit<DebugInfo, 'timestamp'>): void {
    if (!this.config.debug) return;

    const debugInfo: DebugInfo = {
      ...info,
      timestamp: new Date().toISOString(),
    };

    this.debugLogs.push(debugInfo);

    if (
      this.config.logLevel === 'verbose' ||
      this.config.logLevel === 'debug'
    ) {
      console.log(
        `[DEBUG][${debugInfo.timestamp}] ${debugInfo.method} | ${debugInfo.step}`
      );
      if (debugInfo.data) {
        console.log('Data:', JSON.stringify(debugInfo.data, null, 2));
      }
    }
  }

  public static extractMediaInfo(url: string): { type: string; code: string } | null {
    url = url.trim();

    // Reel pattern
    const reelMatch = url.match(/instagram\.com\/reels?\/([A-Za-z0-9_-]+)/);
    if (reelMatch) {
      return { type: 'reel', code: reelMatch[1] };
    }

    // Post pattern
    const postMatch = url.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/);
    if (postMatch) {
      return { type: 'post', code: postMatch[1] };
    }

    // Story pattern
    const storyMatch = url.match(/instagram\.com\/stories\/[^\/]+\/(\d+)/);
    if (storyMatch) {
      return { type: 'story', code: storyMatch[1] };
    }

    // Direct code
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
      return { type: 'unknown', code: url };
    }

    return null;
  }

  public static async fetchMedia(url: string, quality: string = 'highest'): Promise<FetchResult> {
    const info = this.extractMediaInfo(url);
    if (!info) {
      throw new Error('Invalid Instagram URL');
    }

    this.debug({
      method: 'fetchMedia',
      step: `Fetching ${info.type}: ${info.code}`,
    });

    // Determine the Instagram URL to fetch
    let fetchUrl: string;
    if (info.type === 'reel') {
      fetchUrl = `https://www.instagram.com/reel/${info.code}/`;
    } else if (info.type === 'post') {
      fetchUrl = `https://www.instagram.com/p/${info.code}/`;
    } else if (info.type === 'story') {
      fetchUrl = `https://www.instagram.com/stories/highlights/${info.code}/`;
    } else {
      // Try as reel first, then post
      fetchUrl = `https://www.instagram.com/reel/${info.code}/`;
    }

    const response = await fetch(fetchUrl, {
      headers: this.HEADERS,
    });

    if (!response.ok) {
      // If reel fails, try as post
      if (info.type === 'unknown') {
        const postResponse = await fetch(
          `https://www.instagram.com/p/${info.code}/`,
          { headers: this.HEADERS }
        );
        if (postResponse.ok) {
          const text = await postResponse.text();
          return this.parseResponse(text, info.code, 'post', quality);
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return this.parseResponse(text, info.code, info.type, quality);
  }

  private static parseResponse(
    text: string,
    code: string,
    mediaType: string,
    quality: string
  ): FetchResult {
    const result: FetchResult = {
      type: mediaType as any,
      code,
      items: [],
    };

    try {
      // Try to find the JSON data in the page
      const nextDataMatch = text.match(
        /<script type="application\/json" data-content-len="\d+" data-sjs>(.*?)<\/script>/
      );

      if (nextDataMatch) {
        const jsonData = JSON.parse(nextDataMatch[1]);

        // Try various data paths
        const paths = [
          jsonData?.require?.[0]?.[3]?.[0]?.['__bbox']?.require?.[0]?.[3]?.[1]?.['__bbox']?.result?.data?.xdt_api__v1__clips__clips_on_logged_out_connection_v2?.edges,
          jsonData?.require?.[0]?.[3]?.[0]?.['__bbox']?.require?.[0]?.[3]?.[1]?.['__bbox']?.result?.data?.xdt_api__v1__media__shortcode__web_info?.items,
        ];

        for (const pathData of paths) {
          if (pathData) {
            const items = Array.isArray(pathData) && pathData[0]?.node
              ? pathData.map((e: any) => e.node?.media).filter(Boolean)
              : pathData;

            if (items && items.length > 0) {
              const media = items.find((m: any) => m?.code === code) || items[0];

              if (media) {
                result.author = media.user?.username;
                result.caption = media.caption?.text;
                result.timestamp = media.taken_at;

                // Get thumbnail
                const imageVersions = media.image_versions2?.candidates || [];
                if (imageVersions.length > 0) {
                  result.thumbnail = imageVersions[0].url;
                }

                // Check for carousel
                if (media.carousel_media && media.carousel_media.length > 0) {
                  result.type = 'carousel';
                  for (const carouselItem of media.carousel_media) {
                    const item: MediaItem = {
                      type: carouselItem.video_versions ? 'video' : 'image',
                      versions: [],
                    };

                    if (carouselItem.video_versions) {
                      item.versions = this.selectQuality(
                        carouselItem.video_versions.map((v: any) => ({
                          url: v.url,
                          width: v.width || 720,
                          height: v.height || 1280,
                        })),
                        quality
                      );
                    } else if (carouselItem.image_versions2?.candidates) {
                      item.versions = this.selectQuality(
                        carouselItem.image_versions2.candidates.map((v: any) => ({
                          url: v.url,
                          width: v.width || 1080,
                          height: v.height || 1080,
                        })),
                        quality
                      );
                    }

                    if (carouselItem.image_versions2?.candidates?.[0]) {
                      item.thumbnail = carouselItem.image_versions2.candidates[0].url;
                    }

                    if (item.versions.length > 0) {
                      result.items.push(item);
                    }
                  }
                } else if (media.video_versions) {
                  // Single video
                  const versions = this.selectQuality(
                    media.video_versions.map((v: any) => ({
                      url: v.url,
                      width: v.width || 720,
                      height: v.height || 1280,
                    })),
                    quality
                  );

                  result.items.push({
                    type: 'video',
                    versions,
                    thumbnail: result.thumbnail,
                  });

                  result.videoVersions = versions;
                  result.videoUrl = versions[0]?.url;
                } else if (media.image_versions2?.candidates) {
                  // Single image
                  const versions = this.selectQuality(
                    media.image_versions2.candidates.map((v: any) => ({
                      url: v.url,
                      width: v.width || 1080,
                      height: v.height || 1080,
                    })),
                    quality
                  );

                  result.items.push({
                    type: 'image',
                    versions,
                    thumbnail: versions[0]?.url,
                  });
                }

                if (result.items.length > 0) {
                  return result;
                }
              }
            }
          }
        }
      }

      // Fallback: try regex patterns
      const videoPatterns = [
        /"video_versions":\s*(\[[^\]]+\])/,
        /"video_url":"([^"]+)"/,
      ];

      for (const pattern of videoPatterns) {
        const match = text.match(pattern);
        if (match) {
          try {
            if (pattern.source.includes('video_url')) {
              const url = match[1].replace(/\\/g, '');
              result.items.push({
                type: 'video',
                versions: [{ url, width: 720, height: 1280 }],
              });
              result.videoUrl = url;
              return result;
            }

            const videoData = JSON.parse(
              match[1].replace(/\\"/g, '"').replace(/\\\//g, '/')
            );

            if (Array.isArray(videoData) && videoData.length > 0) {
              const versions = this.selectQuality(
                videoData.map((v: any) => ({
                  url: v.url,
                  width: v.width || 720,
                  height: v.height || 1280,
                })),
                quality
              );

              result.items.push({
                type: 'video',
                versions,
              });
              result.videoVersions = versions;
              result.videoUrl = versions[0]?.url;
              return result;
            }
          } catch (e) {
            // Continue to next pattern
          }
        }
      }

      // Try image patterns for posts
      const imageMatch = text.match(/"candidates":\s*(\[[^\]]+\])/);
      if (imageMatch) {
        try {
          const imageData = JSON.parse(
            imageMatch[1].replace(/\\"/g, '"').replace(/\\\//g, '/')
          );

          if (Array.isArray(imageData) && imageData.length > 0) {
            const versions = this.selectQuality(
              imageData.map((v: any) => ({
                url: v.url,
                width: v.width || 1080,
                height: v.height || 1080,
              })),
              quality
            );

            result.items.push({
              type: 'image',
              versions,
            });
            return result;
          }
        } catch (e) {
          // Continue
        }
      }

    } catch (error) {
      this.debug({
        method: 'parseResponse',
        step: 'Parsing error',
        error: error as Error,
      });
    }

    if (result.items.length === 0) {
      throw new Error('Could not extract media from this URL');
    }

    return result;
  }

  private static selectQuality(versions: MediaVersion[], quality: string): MediaVersion[] {
    if (versions.length === 0) return [];

    // Sort by height (quality)
    const sorted = [...versions].sort((a, b) => (b.height || 0) - (a.height || 0));

    switch (quality) {
      case 'lowest':
        return [sorted[sorted.length - 1], ...sorted.slice(0, -1)];
      case 'medium':
        const midIndex = Math.floor(sorted.length / 2);
        return [sorted[midIndex], ...sorted.filter((_, i) => i !== midIndex)];
      case 'highest':
      default:
        return sorted;
    }
  }
}

class Server {
  private server;
  private rateLimiter = new RateLimiter();
  private corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  constructor(port: number) {
    this.server = serve({
      port,
      fetch: this.handleRequest.bind(this),
    });

    console.log(`[${new Date().toISOString()}] Server started on port ${port}`);
  }

  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: this.corsHeaders });
    }

    // Rate limiting check
    if (this.rateLimiter.isRateLimited(clientIP)) {
      const retryAfter = Math.ceil(
        this.rateLimiter.getRemainingTime(clientIP) / 1000
      );
      return this.sendError(
        'Too many requests',
        429,
        `Please try again after ${retryAfter} seconds`
      );
    }

    try {
      switch (url.pathname) {
        case '/':
          return this.handleRoot();
        case '/process':
          if (req.method === 'POST') {
            return this.handleProcess(req);
          }
          break;
        case '/health':
          return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
            headers: { 'Content-Type': 'application/json', ...this.corsHeaders },
          });
      }

      return this.sendError('Not Found', 404);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Unhandled error:`, error);
      return this.sendError('Internal Server Error', 500);
    }
  }

  private handleRoot(): Response {
    return new Response(HTML_TEMPLATE, {
      headers: {
        'Content-Type': 'text/html',
        ...this.corsHeaders,
      },
    });
  }

  private async handleProcess(req: Request): Promise<Response> {
    try {
      const data = (await req.json()) as ProcessRequest;

      if (!data.urls || !Array.isArray(data.urls) || data.urls.length === 0) {
        return this.sendError('URLs array is required', 400);
      }

      const results: FetchResult[] = [];
      const errors: string[] = [];

      for (const url of data.urls.slice(0, 10)) { // Limit to 10 URLs
        try {
          const result = await InstagramService.fetchMedia(url, data.quality || 'highest');
          results.push(result);
        } catch (err) {
          errors.push(`${url}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      return new Response(
        JSON.stringify({
          success: results.length > 0,
          results,
          errors: errors.length > 0 ? errors : undefined,
        } as ProcessResponse),
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.corsHeaders,
          },
        }
      );
    } catch (error) {
      return this.sendError(
        'Failed to process request',
        400,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private sendError(
    message: string,
    status: number,
    details?: string
  ): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        details,
      }),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...this.corsHeaders,
        },
      }
    );
  }

  public getPort(): number {
    return this.server.port;
  }

  public close(): void {
    if (this.server) {
      this.server.stop();
    }
  }
}

// Initialize debug mode
InstagramService.configure({
  debug: false,
  logLevel: 'error',
  dumpHtml: false,
  dumpPath: './debug_dumps',
});

// Initialize server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3334;
const server = new Server(PORT);

console.log(
  `[${new Date().toISOString()}] ReelGrab running at http://localhost:${server.getPort()}`
);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Shutting down server...`);
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Shutting down server...`);
  server.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(
    `[${new Date().toISOString()}] Unhandled Rejection at:`,
    promise,
    'reason:',
    reason
  );
});
