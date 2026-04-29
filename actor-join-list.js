// ==UserScript==
// @name         Eventernote 演者別参加イベント一覧
// @namespace    https://www.eventernote.com/
// @version      0.1.0
// @description  指定した演者が出演している参加イベントを一覧表示する
// @author       pinokotere
// @match        https://www.eventernote.com/actors/*
// @grant        none
// ==/UserScript==

(function () {
    // 自分のIDに変えてね
    const userId = 'pinokotere';
    const numericId = 61711;

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // --- UI構築 ---
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed; top: 10px; right: 10px; z-index: 9999;
        background: #fff; border: 1px solid #ccc; border-radius: 8px;
        padding: 12px; width: 800px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        font-size: 13px;
    `;
    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
            <b>演者別参加イベント検索</b>
            <button id="en_close" style="border:none;background:none;cursor:pointer;font-size:16px">✕</button>
        </div>
        <div style="margin-top:8px">
            <label>演者: <span id="en_actor_name" style="font-weight:bold"></span></label>
        </div>
        <div style="margin-top:4px">
            <label>開始年: <input id="en_start" type="number" value="2009" style="width:60px"></label>
            <label style="margin-left:8px">終了年: <input id="en_end" type="number" value="${new Date().getFullYear()}" style="width:60px"></label>
        </div>
        <div style="margin-top:8px">
            <button id="en_search">検索</button>
            <span id="en_status" style="margin-left:8px;color:#888"></span>
        </div>
        <div id="en_result" style="margin-top:8px;max-height:1000px;overflow-y:auto"></div>
    `;
    document.body.appendChild(container);

    // --- 閉じるボタン ---
    document.getElementById('en_close').addEventListener('click', () => {
        container.remove();
    });

    // --- 演者ページから演者名を自動取得 ---
    let targetActor = '';
    if (location.pathname.startsWith('/actors/')) {
        targetActor = decodeURIComponent(location.pathname.split('/')[2]);
    }
    document.getElementById('en_actor_name').textContent = targetActor || '不明';

    // --- 検索処理 ---
    document.getElementById('en_search').addEventListener('click', async () => {
        const startYear = parseInt(document.getElementById('en_start').value);
        const endYear = parseInt(document.getElementById('en_end').value);
        const status = document.getElementById('en_status');
        const resultDiv = document.getElementById('en_result');

        if (!targetActor) return;
        resultDiv.innerHTML = '';
        const results = [];

        for (let year = startYear; year <= endYear; year++) {
            let page = 1;
            let hasNext = true;

            while (hasNext) {
                status.textContent = `${year}年 p.${page} 取得中...`;
                const url = `https://www.eventernote.com/users/${userId}/events?event_date_like=${year}-%25-%25&page=${page}&user_id=${numericId}&year=${year}`;
                const res = await fetch(url);
                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');

                const events = doc.querySelectorAll('.gb_event_list li.clearfix');
                events.forEach(event => {
                    const actors = [...event.querySelectorAll('.actor ul li a')].map(a => a.textContent.trim());
                    if (actors.includes(targetActor)) {
                        const date = event.querySelector('.date p:first-child')?.textContent.trim();
                        const name = event.querySelector('.event h4 a')?.textContent.trim();
                        const place = event.querySelector('.event .place a')?.textContent.trim();
                        const eventPath = event.querySelector('.event h4 a')?.getAttribute('href');
                        const eventUrl = `https://www.eventernote.com${eventPath}`;
                        results.push({ date, name, place, eventUrl });
                    }
                });

                hasNext = !!doc.querySelector('.pagination .next a');
                page++;
                await sleep(100);
            }
        }

        // --- 結果表示 ---
        results.sort((a, b) => b.date.localeCompare(a.date));
        status.textContent = `${results.length}件見つかりました`;
        if (results.length === 0) {
            resultDiv.innerHTML = '<p>該当イベントなし</p>';
            return;
        }

        const table = document.createElement('table');
        table.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px';
        table.innerHTML = `
            <thead>
                <tr style="background:#f0f0f0">
                    <th style="padding:4px;border:1px solid #ddd">日付</th>
                    <th style="padding:4px;border:1px solid #ddd">イベント名</th>
                    <th style="padding:4px;border:1px solid #ddd">会場</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(e => `
                    <tr>
                        <td style="padding:4px;border:1px solid #ddd;white-space:nowrap">${e.date}</td>
                        <td style="padding:4px;border:1px solid #ddd">
                            <a href="${e.eventUrl}" target="_blank">${e.name}</a>
                        </td>
                        <td style="padding:4px;border:1px solid #ddd">${e.place ?? ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        resultDiv.appendChild(table);
    });
})();
