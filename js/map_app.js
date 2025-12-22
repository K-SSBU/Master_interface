$(document).ready(function () {
    let exp_song_id = null;
    let top5_songs = [];

    const element = document.getElementById('player');
    // Songleプレイヤーのサイズ調整
    const height = element.offsetHeight;
    const player_weight = element.offsetWidth;
    const video_player_height = height - 100;

    let myChartLyric, myChartVocal, myChartInst;
    let lyric_scatterData, vocal_scatterData, inst_scatterData;
    let listenSongID = first_songId; // 再生中の楽曲
    let before_listenSongID;
    let called = false;

    // 評価ボタンの初期値
    let desiredMaxLyric = null;
    let desiredMaxVocal = null;
    let desiredMaxInst = null;

    // シグマの初期値
    let vocal_sigma = 50;
    let inst_sigma = 50;
    let lyric_sigma = 50;

    // const toleranceSetting = "Each" // "Each" "All"
    // const concatType = "AllPattern" // "AllPattern" "MaxMin"
    // console.log("toleranceSetting: " + toleranceSetting);
    // console.log("concatType: " + concatType);

    let evaluatedSongMap = {};  // 評価された曲をsongidごとに1つだけ保持
    let evaluationOrder = 1;    // 評価順インクリメント用

    // songData：配列型の楽曲データ（例：songData["sm15630734"] = 千本桜に関する全データ）
    vocal_scatterData = createScatterData(songData, "vocal");
    inst_scatterData = createScatterData(songData, "inst");
    lyric_scatterData = createScatterData(songData, "lyric");
    // console.log(vocal_scatterData);

    myChartVocal = renderScatterPlot("vocal-scatter", Object.values(vocal_scatterData), "vocal");
    myChartInst = renderScatterPlot("inst-scatter", Object.values(inst_scatterData), "inst");
    myChartLyric = renderScatterPlot("lyric-scatter", Object.values(lyric_scatterData), "lyric");

    songle_player(listenSongID); // songleプレイヤーの表示

    // スライダーで調整した際の更新
    $('#slider1').on('input', function () {
        vocal_sigma = $(this).val();
        // console.log("vocal:"+ vocal_sigma/1000);
        if (toleranceSetting === "All") {
            AllGiveZ_value('vocal');
        }
    });
    $('#slider2').on('input', function () {
        inst_sigma = $(this).val();
        // console.log("accompaniment:"+ inst_sigma/1000);
        if (toleranceSetting === "All") {
            AllGiveZ_value('inst');
        }
    });
    $('#slider3').on('input', function () {
        lyric_sigma = $(this).val();
        // console.log("lyrics:"+ lyric_sigma/1000);
        if (toleranceSetting === "All") {
            AllGiveZ_value('lyric');
        }
    });

    // 各評価ボタンのアイコンの色を変更する関数
    $('.rating-button').on('click', function () {
        // 同じ評価タイプ内のすべてのボタンをリセット
        $(this).closest('.evaluation-content').find('.rating-button').removeClass('active');

        // クリックされたボタンに"active"クラスを追加
        $(this).addClass('active');

        // desired_maxを更新
        const parentDivId = $(this).closest('.evaluation-content').parent().attr('id');
        const value = parseFloat($(this).data('value'));
        // console.log(parentDivId);

        if (parentDivId === 'vocal-evaluation') {
            // 歌声を評価したとき
            desiredMaxVocal = value;
            vocal_scatterData[listenSongID].Z_value = desiredMaxVocal;
            vocal_scatterData[listenSongID].vocal_value = desiredMaxVocal;
            vocal_scatterData[listenSongID].vocal_rating = desiredMaxVocal;
            vocal_scatterData[listenSongID].listen_flag = true;
            songData[listenSongID].listen_flag = true;
            songData[listenSongID].vocal_rating = desiredMaxVocal;

            if (toleranceSetting === "All") {
                AllGiveZ_value('vocal');
            }
        } else if (parentDivId === 'inst-evaluation') {
            // 伴奏を評価したとき
            desiredMaxInst = value;
            inst_scatterData[listenSongID].Z_value = desiredMaxInst;
            inst_scatterData[listenSongID].inst_value = desiredMaxInst;
            inst_scatterData[listenSongID].inst_rating = desiredMaxInst;
            inst_scatterData[listenSongID].listen_flag = true;
            songData[listenSongID].listen_flag = true;
            songData[listenSongID].inst_rating = desiredMaxInst;

            if (toleranceSetting === "All") {
                AllGiveZ_value('inst');
            }
        } else if (parentDivId === 'lyric-evaluation') {
            // 歌詞を評価したとき
            desiredMaxLyric = value;
            lyric_scatterData[listenSongID].Z_value = desiredMaxLyric;
            lyric_scatterData[listenSongID].lyric_value = desiredMaxLyric;
            lyric_scatterData[listenSongID].lyric_rating = desiredMaxLyric;
            lyric_scatterData[listenSongID].listen_flag = true;
            songData[listenSongID].listen_flag = true;
            songData[listenSongID].lyric_rating = desiredMaxLyric;

            if (toleranceSetting === "All") {
                AllGiveZ_value('lyric');
            }
        }

    });

    // 探索タブ切り替え処理
    $('#explore-playlist').on('click', function () {
        if ($(this).hasClass('select-type')) return;  // タブの連打防止
        finalizeCurrentSongRatings(listenSongID);

        $('#exp-song-content').show();
        $('#rec-song-content').hide();

        $('#explore-playlist').removeClass('non-select-type');
        $('#explore-playlist').addClass('select-type');
        $('#recommend-playlist').removeClass('select-type');
        $('#recommend-playlist').addClass('non-select-type');

        if (exp_song_id) {
            display_song(exp_song_id, 'explore');
        }
    });

    // 推薦タブ切り替え処理
    $('#recommend-playlist').on('click', function () {
        if ($(this).hasClass('select-type')) return;  // タブの連打防止
        // console.log("before:"+ listenSongID);

        $('#exp-song-content').hide();
        $('#rec-song-content').show();

        $('#recommend-playlist').removeClass('non-select-type');
        $('#recommend-playlist').addClass('select-type');
        $('#explore-playlist').removeClass('select-type');
        $('#explore-playlist').addClass('non-select-type');

        if (typeof top5_songs !== 'undefined') {
            render_rec_songs(top5_songs);
        }
        // console.log("now:"+ listenSongID);
    });

    // 推薦タブ内の楽曲クリックで表示更新
    $(document).on('click', '.rec-song-item', function () {
        finalizeCurrentSongRatings(listenSongID);

        listenSongID = $(this).data('songid');
        if (listenSongID) {
            display_song(listenSongID, 'recommend');
        }
    });

    // exp-song-content 内に動的に挿入された NEXT SONG ボタンをクリックしたときの処理
    $(document).on('click', '#exp-song-content .next-song-button', function () {
        if (songData[listenSongID]?.listen_flag === true) {
            if (!hasAnyListenedInTopSongs(top5_songs)) {
                alert("RECOMMEND タブの楽曲を1曲以上評価してください");
                return;
            }

            finalizeCurrentSongRatings(listenSongID);

            exp_song_id = explore_song();
            top5_songs = recommend_songs();
            render_exp_song(exp_song_id);
            display_song(exp_song_id, 'explore');
        } else {
            alert("EXPLORE 楽曲を評価してください");
        }
    });

    // 事前選択の楽曲表示タブから、探索・推薦タブへ表示切り替え
    $('.next-song-button').on('click', function () {
        // 楽曲を評価したか
        if (songData[listenSongID]?.listen_flag === true) {
            finalizeCurrentSongRatings(listenSongID);

            $('.first-song-area').hide();
            exp_song_id = explore_song(); // 探索楽曲
            top5_songs = recommend_songs(); // 推薦楽曲（5曲）

            render_exp_song(exp_song_id); // 探索楽曲を表示
            $('.exp-rec-area').css('display', 'block'); //探索・推薦タブを表示
            display_song(exp_song_id, 'explore'); // プレイヤー・評価ボタンの更新 + 表示中の楽曲タイトルを緑色に変更

            $('#explore-playlist').trigger('click');
            // console.log(listenSongID);
        } else {
            alert("このタブ内の楽曲を評価してください");
        }
    });

    // 探索タブのイベントリスナー
    function explore_song() {

        // 各カテゴリーのZ値が-0.3~0.3の曲を抽出
        const lyricCandidates = Object.values(lyric_scatterData).filter(song => song.lyric_value >= -0.3 && song.lyric_value <= 0.3 && !song.listen_flag);
        const vocalCandidates = Object.values(vocal_scatterData).filter(song => song.vocal_value >= -0.3 && song.vocal_value <= 0.3 && !song.listen_flag);
        const instCandidates = Object.values(inst_scatterData).filter(song => song.inst_value >= -0.3 && song.inst_value <= 0.3 && !song.listen_flag);

        // 各カテゴリの曲数を比較して最多（最少）カテゴリを選択
        const maxCount = Math.max(lyricCandidates.length, vocalCandidates.length, instCandidates.length);
        // const maxCount = Math.min(lyricCandidates.length, vocalCandidates.length, instCandidates.length);
        let candidateCategories = [];

        if (vocalCandidates.length === maxCount) {
            candidateCategories.push(vocalCandidates);
            // console.log("vocal");
        };
        if (instCandidates.length === maxCount) {
            candidateCategories.push(instCandidates);
            // console.log("accompaniment");
        };
        if (lyricCandidates.length === maxCount) {
            candidateCategories.push(lyricCandidates);
            // console.log("lyric");
        };
        // ランダムに1つのカテゴリから1曲選択
        if (candidateCategories.length > 0) {
            const selectedCategory = candidateCategories[Math.floor(Math.random() * candidateCategories.length)];
            const randomSong = selectedCategory[Math.floor(Math.random() * selectedCategory.length)];
            const nextSongId = randomSong.songid;
            // finalizeCurrentSongRatings(listenSongID);
            before_listenSongID = listenSongID;
            listenSongID = nextSongId; // 次の楽曲IDを設定

            // categoryごとのvalueの更新（計算時のZの前に持っていた値）
            if (songData[before_listenSongID].listen_flag === true) {
                Object.entries(songData).forEach(([key, song]) => {
                    if (vocal_scatterData[key]) {
                        song.vocal_value = vocal_scatterData[key].Z_value;
                    }
                    if (inst_scatterData[key]) {
                        song.inst_value = inst_scatterData[key].Z_value;
                    }
                    if (lyric_scatterData[key]) {
                        song.lyric_value = lyric_scatterData[key].Z_value;
                    }
                });
            }
            // console.log("ExploreSong:"+ nextSongId);
            return nextSongId;
        }
    }

    // 推薦タブのイベントリスナー
    function recommend_songs() {
        const sumData = {};
        const allSongIDs = Object.keys(vocal_scatterData);

        allSongIDs.forEach(songID => {
            const isListened = vocal_scatterData[songID]?.listen_flag === false;

            if (isListened) {
                const vocalZ = vocal_scatterData[songID]?.Z_value ?? 0;
                const instZ = inst_scatterData[songID]?.Z_value ?? 0;
                const lyricZ = lyric_scatterData[songID]?.Z_value ?? 0;

                sumData[songID] = {
                    songid: songID,
                    title: vocal_scatterData[songID]?.title,
                    writer: vocal_scatterData[songID]?.writer,
                    thumbnail: vocal_scatterData[songID]?.thumbnail,
                    total_Z_value: (vocalZ + instZ + lyricZ) / 3
                };
            }
        });

        const sortedSongZ = Object.values(sumData).sort((a, b) => b.total_Z_value - a.total_Z_value);
        // console.log(sortedSongZ.slice(0, 5));

        // 平均Z値が全て0の場合
        // if (sortedSongZ.every(song => song.total_Z_value === 0)) {
        //     return; // 評価済みのデータがなければ何もせず終了
        // }

        // let nextSongId;
        // if (!songData[listenSongID]?.listen_flag) {
        //     // 現在の楽曲が未評価 → 楽曲変更せず終了
        //     nextSongId = listenSongID;
        // } else {
        //     // 通常通り推薦結果を採用
        //     nextSongId = sortedSongZ[0].songid;
        // }

        before_listenSongID = listenSongID;
        // categoryごとのvalueの更新
        if (songData[before_listenSongID].listen_flag === true) {
            Object.entries(songData).forEach(([key, song]) => {
                if (vocal_scatterData[key]) {
                    song.vocal_value = vocal_scatterData[key].Z_value;
                }
                if (inst_scatterData[key]) {
                    song.inst_value = inst_scatterData[key].Z_value;
                }
                if (lyric_scatterData[key]) {
                    song.lyric_value = lyric_scatterData[key].Z_value;
                }
            });
        }
        return sortedSongZ.slice(0, 5);
    }

    // 探索結果の楽曲を表示する関数
    function render_exp_song(exp_song_id) {
        let exp_song = songData[exp_song_id];

        const expHTML = `
            <div class="exp-song-item" data-songid="${exp_song_id}">
                <div class="song-main">
                    <div class="song-icon">
                        <img src="${exp_song.thumbnail}"></img>
                    </div>
                    <div class="song-text">
                        <div class="song-title">${exp_song.title}
                            <div class="song-writer">${exp_song.writer}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="next-song-button">
                <div class="next-song-text">NEXT SONG</div>
            </div>
            `;
        $('#exp-song-content').html(expHTML);
    }

    // 推薦結果のプレイリストを表示する関数
    function render_rec_songs(top5_songs) {
        const recHTML = `
            ${top5_songs.map((song, index) => `
                <div class="rec-song-item" data-songid="${song.songid}">
                    <div class="song-main">
                        <div class="song-rank">${index + 1}</div>
                        <div class="rec-song-icon">
                            <img src="${song.thumbnail}"></img>
                        </div>
                        <div class="rec-song-text">
                            <div class="song-title">${song.title}
                                <div class="song-writer">${song.writer}</div>
                            </div>
                        </div>
                    </div>
                </div>
                `).join('')}
        `;
        $('#rec-song-content').html(recHTML);

        // 未評価の中で最もインデックスが小さいものを取得
        const firstUnlistened = top5_songs.find(song => songData[song.songid]?.listen_flag === false);

        // 未評価がなければインデックス0の曲を再生、それもなければ先頭
        const targetSongId = firstUnlistened?.songid || top5_songs[0]?.songid || top5_songs[0]?.songid;

        if (targetSongId) {
            if (songData[listenSongID]?.listen_flag === true) {
                finalizeCurrentSongRatings(listenSongID);
            }

            display_song(targetSongId, 'recommend');
        }
    }

    function hasAnyListenedInTopSongs(topSongs) {
        // 推薦がまだ生成されていない/空のときは「チェック対象なし」扱いで通す（必要なら false に変えてください）
        if (!Array.isArray(topSongs) || topSongs.length === 0) return true;

        return topSongs.some(s => songData?.[s.songid]?.listen_flag === true);
    }

    // 楽曲の動画を表示
    function display_song(SongId, songType) {
        if (songType) songData[SongId].song_type = songType;

        // 評価値をその曲に応じて復元
        const song = songData[SongId];
        desiredMaxLyric = song.lyric_rating ?? null;
        desiredMaxVocal = song.vocal_rating ?? null;
        desiredMaxInst = song.inst_rating ?? null;
        // console.log(song);
        // console.log(desiredMaxVocal);

        $('.rating-button').removeClass('active');

        // 評価済み楽曲の時に、該当するボタンに .active を付ける
        ['vocal', 'inst', 'lyric'].forEach(target => {
            const rating = song[`${target}_rating`];
            // console.log(song);
            if (rating !== undefined && rating !== null) {
                const ratingStr = rating.toFixed(1);  // ex: 0 → "0.0"
                // console.log(ratingStr);
                $(`#${target}-evaluation .rating-button[data-value="${ratingStr}"]`).addClass('active');
            }
        });

        // プレイヤーと散布図の更新
        songle_player(SongId);
        unevaluatedScatterPlotColors(SongId);

        // 楽曲名のハイライトを更新（緑に）
        $('.song-title').css('color', ''); // 全てリセット
        $(`#exp-song-content .exp-song-item[data-songid="${SongId}"] .song-title`).css('color', 'rgba(73,211,85,0.88)');
        $(`#rec-song-content .rec-song-item[data-songid="${SongId}"] .song-title`).css('color', 'rgba(73,211,85,0.88)');
    }

    // 未評価要素を0に確定してから次の曲へ進む
    function finalizeCurrentSongRatings(songId) {
        if (!songId) return;
        // 1つも評価してない曲は対象外（従来の挙動を保持）
        if (songData[songId]?.listen_flag !== true) return;

        ['vocal', 'inst', 'lyric'].forEach(cat => {
            if (songData[songId][`${cat}_rating`] == null) {
                // 楽曲本体
                songData[songId][`${cat}_rating`] = 0.0;
                songData[songId][`${cat}_value`] = 0.0;

                // 表示用scatterData側
                const sd = (cat === 'vocal') ? vocal_scatterData
                    : (cat === 'inst') ? inst_scatterData
                        : lyric_scatterData;

                if (sd[songId]) {
                    sd[songId][`${cat}_rating`] = 0.0;
                    sd[songId][`${cat}_value`] = 0.0;
                    sd[songId].Z_value = 0.0;
                    sd[songId].listen_flag = true;
                }
            }
        });

        // 曲自体のlisten_flagを統一（各散布図側も合わせる）
        songData[songId].listen_flag = true;
        if (vocal_scatterData[songId]) vocal_scatterData[songId].listen_flag = true;
        if (inst_scatterData[songId]) inst_scatterData[songId].listen_flag = true;
        if (lyric_scatterData[songId]) lyric_scatterData[songId].listen_flag = true;

        upsertEvaluatedSong(songId);

        // console.log("評価した楽曲数：" + Object.values(songData).filter(s => s.listen_flag === true).length);
    }

    // 散布図データ作成
    function createScatterData(songData, category) {
        return Object.fromEntries(
            Object.entries(songData).map(([key, song]) => {
                const pos = song.position[mapType][category];
                const scatterPoint = {
                    songid: key,
                    x: pos[0],
                    y: pos[1],
                    title: song.title,
                    writer: song.writer,
                    url: song.url,
                    thumbnail: song.thumbnail,
                    listen_flag: song.listen_flag,
                    Z_value: song[`${category}_value`],

                    // カテゴリごとの情報
                    [`${category}_value`]: song[`${category}_value`],
                    [`${category}_sigma`]: song[`${category}_sigma`],
                    [`${category}_rating`]: song[`${category}_rating`],
                };
                return [key, scatterPoint];
            })
        );
    }


    // 散布図を描画する関数
    function renderScatterPlot(canvasId, scatterData, category) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: '曲',
                        data: scatterData,
                        backgroundColor: scatterData.map(() => 'rgba(0,0,0,0.75)'),
                        pointRadius: scatterData.map(() => 1.65),
                    }]
            },
            options: {
                maintainAspectRatio: false,
                layout: { padding: 20 },
                animation: { duration: 0 },
                scales: {
                    x: { display: false },
                    y: { display: false }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (tooltipItem) => {
                                const dataPoint = tooltipItem.raw;
                                return [
                                    `${dataPoint.title}`,
                                    `${dataPoint.writer}`
                                    // `Z = ${dataPoint.Z_value.toFixed(4)}`
                                ];
                            }
                        },
                        mode: 'nearest',
                        intersect: true,
                        bodyFont: { size: 18, weight: 'bold' }
                    }
                },
                // マップ上で楽曲をクリックした際、プレイヤーに表示する楽曲を変更
                onClick: (evt, elements) => {
                    // listenSongIDがfirst_songIdときはマップのクリック不可
                    if (listenSongID === first_songId) {
                        alert("2曲目以降からマップのクリックが可能です！");
                        return
                    };

                    if (!hasAnyListenedInTopSongs(top5_songs)) {
                        alert("RECOMMEND タブの楽曲を1曲以上評価してください");
                        return;
                    }

                    if (elements.length > 0) {
                        const chart = elements[0].element.$context.chart;
                        const dataIndex = elements[0].index;
                        const clickedSong = chart.data.datasets[0].data[dataIndex];
                        const clickedSongId = clickedSong.songid;

                        // マップで選んだ曲を評価後、別の点を押したらアラートして止める
                        const current = songData?.[listenSongID];
                        if (
                            current?.song_type === 'map' &&
                            current?.listen_flag === true &&
                            clickedSongId !== listenSongID
                        ) {
                            alert("別の点を選ぶ前に NEXT SONG ボタンを押して、RECOMMEND タブの楽曲を1曲以上評価してください");
                            return;
                        }

                        if (songData[listenSongID].listen_flag === true) {
                            Object.entries(songData).forEach(([key, song]) => {
                                if (vocal_scatterData[key]) {
                                    song.vocal_value = vocal_scatterData[key].Z_value;
                                }
                                if (inst_scatterData[key]) {
                                    song.inst_value = inst_scatterData[key].Z_value;
                                }
                                if (lyric_scatterData[key]) {
                                    song.lyric_value = lyric_scatterData[key].Z_value;
                                }
                            });
                        }

                        finalizeCurrentSongRatings(listenSongID);
                        desiredMaxLyric = null;
                        desiredMaxVocal = null;
                        desiredMaxInst = null;
                        $('.rating-button').removeClass('active');
                        listenSongID = clickedSongId;

                        $('.first-song-area').show();
                        $('.exp-rec-area').hide();
                        updateFirstSongArea(clickedSongId);
                        display_song(clickedSongId, 'map');
                    }
                }
            }
        });
        return chart;
    }

    // マップ上の曲をクリックしたときに表示するエリア（first-song-areaのUIを再利用）
    function updateFirstSongArea(songId) {
        const song = songData[songId];
        const html = `
            <div class="annotation-text">SELECTED SONG</div>
            <div class="song-main">
                <div class="song-icon">
                    <img src="${song.thumbnail}"></img>
                </div>
                <div class="song-text">
                    <div class="song-title song-title-highlight">${song.title}
                        <div class="song-writer">${song.writer}</div>
                    </div>
                </div>
            </div>
        `;
        $('.first-song-area .song-info').html(html);  // .song-info をHTMLに用意しておく
    }

    // songleプレイヤーの表示
    function songle_player(songId) {
        // var song_select_check = false; // 初期状態：プレイリストをクリックしていない
        // var selected_song = null; // クリックされた楽曲（初期状態は無し）

        const url = songData[songId].url; // 楽曲URL
        listenSongID = songId; // クリックされた曲のIDを保存

        // songle 読み込み
        $('#player').html(`
            <div data-api="songle-widget-extra-module" data-url="${url}" id="songle-widget" data-songle-widget-ctrl="0" data-api-chorus-auto-reload="1" data-song-start-at="0"
            data-video-player-size-w="${player_weight}" data-video-player-size-h="${video_player_height}" data-songle-widget-size-w="${player_weight}" data-songle-widget-size-h="100"></div>
        `);
        $.getScript("https://widget.songle.jp/v1/widgets.js"); // songle プレイヤーを表示

        // ページ移動時に一度だけ実行
        if (!called) {
            unevaluatedScatterPlotColors(songId); // 散布図の色を更新
            called = true;
        }
        // song_select_check = true;
        // selected_song = $(this); // 現在選択された楽曲を記録
    }

    // Z計算関数
    function calculateZ(x, y, mu_x, mu_y, sigma, desiredMax, coef) {
        // desiredMax = w
        // coef = 1/2πσ^2
        const dx = (x - mu_x);
        const dy = (y - mu_y);
        const Z_raw = coef * Math.exp(-0.5 * ((dx * dx + dy * dy) / (sigma * sigma)));
        return (Z_raw / coef) * desiredMax;
    }

    // IDW計算関数
    function idwBlendValues(x, y, pts, power = 2.0, eps = 1e-12) {
        // x, y:未評価楽曲の座標
        // pts:評価済みの楽曲
        // if (!pts || pts.length === 0) return 0.0;

        let wSum = 0.0;
        let vSum = 0.0;

        for (const p of pts) {
            const dx = x - p.x;
            const dy = y - p.y;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d < eps) return p.value; // 同一点はその値

            const w = 1.0 / (Math.pow(d, power) + eps);

            wSum += w;
            vSum += w * p.value;
        }
        return (wSum > 0) ? (vSum / wSum) : 0.0;
    }

    // ガウスカーネル回帰計算関数
    // function gkrEstimate(x, y, centers, sigma, eps = 1e-12) {
    //     if (!centers || centers.length === 0) return 0.0;

    //     let num = 0.0; // Σ K * y
    //     let den = 0.0; // Σ K

    //     for (const c of centers) {
    //         const dx = x - c.x;
    //         const dy = y - c.y;
    //         const k  = Math.exp(-0.5 * ((dx*dx + dy*dy) / (sigma*sigma)));

    //         num += k * c.value;
    //         den += k;
    //     }
    //     return (den > eps) ? (num / den) : 0.0;
    // }

    // 要素ごとの各楽曲にガウス分布を付与する関数（各楽曲で同じ許容度設定）
    function AllGiveZ_value(category) {
        // 対象カテゴリの scatterData と現在のσ
        const sd = (category === 'vocal') ? vocal_scatterData
            : (category === 'inst') ? inst_scatterData
                : lyric_scatterData;

        const sigma = (category === 'vocal') ? (vocal_sigma / 1000)
            : (category === 'inst') ? (inst_sigma / 1000)
                : (lyric_sigma / 1000);

        const coef = 1 / (2 * Math.PI * sigma * sigma);

        if (concatType === 'AllPattern') {

            // center：評価済み楽曲
            const centersAll = Object.values(sd).filter(c =>
                songData[c.songid][`${category}_rating`] != null
            );

            const contribTh = 0.0; // 閾値を0（0以外の評価の時を対象）
            const power = 2.0;

            // 未評価楽曲に対してのループ
            Object.values(sd).forEach(p => {
                if (p.listen_flag === true) return; // 評価済み曲の評価値は固定

                // この点pに対し |contrib|>=0 の評価済み曲だけ集める
                const contributors = [];

                for (const center of centersAll) {
                    const mu_x = center.x;
                    const mu_y = center.y;
                    const desiredMax = Number(songData[center.songid][`${category}_rating`]) || 0.0;

                    // ガウス分布付与
                    const contrib = calculateZ(p.x, p.y, mu_x, mu_y, sigma, desiredMax, coef);

                    // 閾値に該当する評価済み楽曲リストを作成
                    if (Math.abs(contrib) > contribTh) {
                        contributors.push({ x: mu_x, y: mu_y, value: contrib });
                    }
                }

                let pred = 0.0;
                if (contributors.length === 0) {
                    pred = 0.0;
                } else if (contributors.length === 1) {
                    pred = contributors[0].value; // 1つだけならそのガウス値
                } else {
                    pred = idwBlendValues(p.x, p.y, contributors, power); // 複数ならIDW
                }

                songData[p.songid][`${category}_value`] = pred;
                p[`${category}_value`] = pred;
                p.Z_value = pred;
            });

            selectedScatterPlotColors(listenSongID, category);
        }
    }


    // 未評価楽曲を表示する時にマップの色を更新する関数
    function unevaluatedScatterPlotColors(selectedSongId) {
        const CYAN = 'rgb(77, 196, 255)';

        [myChartLyric, myChartVocal, myChartInst].forEach(chart => {
            if (!chart) return;

            const ds = chart.data.datasets[0];
            const data = ds.data.slice(); // 破壊を避けてコピー

            // 選択点を最後に移動（前面に描画）
            const idx = data.findIndex(p => p.songid === selectedSongId);
            if (idx !== -1) {
                const sel = data.splice(idx, 1)[0];
                data.push(sel);
            }

            // 色・半径・枠線を更新
            ds.data = data;
            ds.backgroundColor = data.map(p => {
                const isSelected = p.songid === selectedSongId;
                const isUnlistened = p.listen_flag === false;
                if (isSelected && isUnlistened) return CYAN; // 未評価の選択点だけ水色
                const z = Number(p.Z_value ?? 0);
                if (z >= 1) return d3.interpolateRdYlGn(0.9);
                if (z <= -1) return d3.interpolateRdYlGn(0.1);
                return d3.interpolateRdYlGn(0.4 * z + 0.5);
            });
            ds.pointRadius = data.map(p =>
                (p.songid === selectedSongId) ? 6.5 : (p.listen_flag ? 4.5 : 1.65) // 評価済みなら中サイズ、未評価なら小
            );
            ds.borderColor = data.map(p =>
                p.listen_flag ? CYAN : 'rgba(0,0,0,0)' // 円周の色設定
            );
            ds.borderWidth = data.map(p =>
                (p.songid === selectedSongId || p.listen_flag) ? 2.5 : 0 // 円周の太さ設定
            );

            chart.update();
        });
    }

    // 楽曲を評価時・許容度を変更時にマップの色を変更する関数（要素ごとに処理）
    function selectedScatterPlotColors(selectedSongId, category) {
        const CYAN = 'rgb(77, 196, 255)'; // 評価直後に目立たせる色

        // 対象カテゴリの scatterData / chart を取得
        const sd = category === 'vocal' ? vocal_scatterData
            : category === 'inst' ? inst_scatterData
                : lyric_scatterData;

        // 未評価のときにスライダを動かしても，水色の点を維持する
        if (sd[selectedSongId]?.listen_flag === false) {
            unevaluatedScatterPlotColors(selectedSongId);
            // console.log("楽曲が未評価でスライダを動かしています");
            return;
        }

        const chart = category === 'vocal' ? myChartVocal
            : category === 'inst' ? myChartInst
                : myChartLyric;

        // データを配列化し、選択点を最後にして前面へ
        const data = Object.values(sd);
        const idx = data.findIndex(p => p.songid === selectedSongId);
        if (idx !== -1) { const sel = data.splice(idx, 1)[0]; data.push(sel); }

        // チャートへ反映
        const ds = chart.data.datasets[0];
        ds.data = data;
        ds.backgroundColor = data.map(p => {
            const z = Number(p.Z_value ?? 0);
            if (z >= 1) return d3.interpolateRdYlGn(0.9);
            if (z <= -1) return d3.interpolateRdYlGn(0.1);
            return d3.interpolateRdYlGn(0.4 * z + 0.5);
        });
        ds.pointRadius = data.map(p =>
            (p.songid === selectedSongId) ? 6.5 : (p.listen_flag ? 4.5 : 1.65) // 評価済みなら中サイズ、未評価なら小
        );
        ds.borderColor = data.map(p =>
            p.listen_flag ? CYAN : 'rgba(0,0,0,0)' // 円周の色設定
        );
        ds.borderWidth = data.map(p =>
            (p.songid === selectedSongId || p.listen_flag) ? 2.5 : 0 // 円周の太さ設定
        );
        chart.update();
    }

    // ====== 1) 各マップの右上に「拡大」ボタンを差し込む ======
    (function injectExpandButtons() {
        // .map 直下の canvas を拾って、そのマップの later-info 内の右側にボタンを置く
        $('.map').each(function () {
            const $map = $(this);
            const canvasId = $map.find('canvas.scatter').attr('id');
            if (!canvasId) return;
            const $sigmaArea = $map.find('.later-info .sigma-area');
            const btnHtml = `
            <button class="expand-canvas" data-target="${canvasId}" aria-label="拡大">
                <span class="material-icons">open_in_full</span>
            </button>`;
            // スライダの左に置く
            $sigmaArea.prepend(btnHtml);
        });
    })();

    // ====== 2) オーバーレイ内部状態 ======
    let overlayState = { canvas: null, parent: null, placeholder: null, chart: null, sliderOrig: null, sliderSync: null };


    function findChartByCanvas(canvasEl) {
        if (Chart.getChart) return Chart.getChart(canvasEl);
        // フォールバック（手元参照から捜索）
        const list = [myChartVocal, myChartInst, myChartLyric].filter(Boolean);
        return list.find(c => c.canvas === canvasEl) || null;
    }

    // ====== 3) オープン / クローズ ======
    function openCanvasOverlay(canvasId, titleText) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        if (overlayState.canvas) closeCanvasOverlay();

        // ★先に「元のmap」と「元スライダ」を取る（canvasを移動する前！）
        const mapRoot = canvas.closest('.map');
        const sliderOrig = mapRoot?.querySelector('.later-info input[type="range"]') ?? null;

        const placeholder = document.createElement('div');
        placeholder.className = 'canvas-placeholder';
        const parent = canvas.parentNode;
        parent.insertBefore(placeholder, canvas);

        // （ここでcanvasを移動）
        document.querySelector('#canvas-overlay .canvas-host').appendChild(canvas);

        // タイトル更新（既存）
        const titleEl = document.querySelector('#canvas-overlay .overlay-title');
        const base = canvasId.replace(/-scatter$/, '').toUpperCase();
        const pretty = ({ INST: 'ACCOMPANIMENT', LYRIC: 'LYRICS' }[base] ?? base);
        titleEl.textContent = titleText ?? pretty;

        // ★スライダをオーバーレイに表示（クローンして同期）
        const controlsHost = document.querySelector('#canvas-overlay .overlay-controls');
        controlsHost.innerHTML = '';

        let sliderSync = null;
        if (sliderOrig) {
            const sliderClone = sliderOrig.cloneNode(true);
            sliderClone.removeAttribute('id');
            sliderClone.value = sliderOrig.value;

            sliderClone.addEventListener('input', () => {
                sliderOrig.value = sliderClone.value;
                sliderOrig.dispatchEvent(new Event('input', { bubbles: true }));
            });

            sliderSync = () => { sliderClone.value = sliderOrig.value; };
            sliderOrig.addEventListener('input', sliderSync);

            controlsHost.appendChild(sliderClone);
        }

        // …（以下はそのまま）
        const chart = findChartByCanvas(canvas);
        $('#canvas-overlay').addClass('open');
        document.body.classList.add('no-scroll');
        if (chart) chart.resize();

        overlayState = { canvas, parent, placeholder, chart, sliderOrig, sliderSync };
    }

    function closeCanvasOverlay() {
        const { canvas, parent, placeholder, chart, sliderOrig, sliderSync } = overlayState;
        if (!canvas) return;

        // ★同期解除＆スライダ表示を消す
        if (sliderOrig && sliderSync) sliderOrig.removeEventListener('input', sliderSync);
        const controlsHost = document.querySelector('#canvas-overlay .overlay-controls');
        if (controlsHost) controlsHost.innerHTML = '';

        parent.insertBefore(canvas, placeholder);
        placeholder.remove();

        $('#canvas-overlay').removeClass('open');
        document.body.classList.remove('no-scroll');
        if (chart) chart.resize();

        overlayState = { canvas: null, parent: null, placeholder: null, chart: null, sliderOrig: null, sliderSync: null };
    }

    // 背景クリック/×/Escでクローズ
    $(document).on('click', '.overlay-close', closeCanvasOverlay);
    $('#canvas-overlay').on('click', function (e) {
        if (e.target.id === 'canvas-overlay') closeCanvasOverlay();
    });
    $(document).on('keydown', function (e) {
        if ($('#canvas-overlay').hasClass('open') && e.key === 'Escape') closeCanvasOverlay();
    });

    // ====== 4) ボタンクリックで拡大 ======
    $(document).on('click', '.expand-canvas', function () {
        const id = $(this).data('target');
        // data-title を付けたい場合は $(this).data('title') を渡す
        openCanvasOverlay(id);
    });

    // CSV出力関係
    // 評価した曲の情報を保存 
    function upsertEvaluatedSong(songId) {
        if (!songId) return;

        // 初回だけ order を付与（同じ曲を再度確定したら上書き）
        const prev = evaluatedSongMap[songId];
        const order = prev?.order ?? evaluationOrder++;

        evaluatedSongMap[songId] = {
            order,
            songid: songId,
            song_type: songData[songId]?.song_type ?? "",
            vocal_rating: songData[songId]?.vocal_rating ?? null,
            inst_rating: songData[songId]?.inst_rating ?? null,
            lyric_rating: songData[songId]?.lyric_rating ?? null,
            vocal_sigma: vocal_sigma,
            inst_sigma: inst_sigma,
            lyric_sigma: lyric_sigma,
        };
    }

    // 最後の推薦候補の楽曲リスト
    function getRecommendSongsForCSV(n = 50) {
        const allSongIDs = Object.keys(vocal_scatterData);

        const list = allSongIDs
            .filter(songID => vocal_scatterData[songID]?.listen_flag === false) // 未評価のみ
            .map(songID => {
                const vocalZ = Number(vocal_scatterData[songID]?.Z_value ?? 0);
                const instZ = Number(inst_scatterData[songID]?.Z_value ?? 0);
                const lyricZ = Number(lyric_scatterData[songID]?.Z_value ?? 0);
                return {
                    songid: songID,
                    title: vocal_scatterData[songID]?.title ?? "",
                    total_Z_value: (vocalZ + instZ + lyricZ) / 3
                };
            })
            .sort((a, b) => b.total_Z_value - a.total_Z_value)
            .slice(0, n);

        return list;
    }

    // CSV出力
    function exportEvaluatedSongsToCSV() {
        // ---- 左ブロック：曲ごとのログ ----
        const leftHeader = [
            "", "songid", "song_type",
            "vocal_sigma", "accompaniment_sigma", "lyrics_sigma",
            "vocal_rating", "accompaniment_rating", "lyrics_rating"
        ];

        const leftRows = Object.values(evaluatedSongMap)
            .sort((a, b) => a.order - b.order)
            .map(song => [
                song.order,
                song.songid,
                song.song_type ?? "",
                ((song.vocal_sigma ?? 0) / 1000),
                ((song.inst_sigma ?? 0) / 1000),
                ((song.lyric_sigma ?? 0) / 1000),
                song.vocal_rating ?? "",
                song.inst_rating ?? "",
                song.lyric_rating ?? ""
            ]);

        // ---- 右ブロック：評価値ごとの合計数 ----
        const levels = [-1, -0.5, 0, 0.5, 1];
        const counts = {
            vocal: Object.fromEntries(levels.map(v => [v, 0])),
            inst: Object.fromEntries(levels.map(v => [v, 0])),
            lyric: Object.fromEntries(levels.map(v => [v, 0])),
        };

        const addCount = (bucket, r) => {
            if (r === "" || r == null) return; // 空欄は除外
            const v = Number(r);
            if (Number.isFinite(v) && v in bucket) bucket[v]++;
        };

        for (const s of Object.values(evaluatedSongMap)) {
            addCount(counts.vocal, s.vocal_rating);
            addCount(counts.inst, s.inst_rating);
            addCount(counts.lyric, s.lyric_rating);
        }

        const rightHeader = ["rating_count", "vocal", "accompaniment", "lyrics"];
        const rightRows = levels.map(v => [
            v,
            counts.vocal[v],
            counts.inst[v],
            counts.lyric[v]
        ]);

        // ---- 2ブロックを横結合 ----
        const gap = ["", "", ""];
        const totalRows = Math.max(1 + leftRows.length, 1 + rightRows.length);

        const padLeft = (row) => {
            const a = row ?? [];
            const out = a.slice();
            while (out.length < leftHeader.length) out.push("");
            return out;
        };
        const padRight = (row) => {
            const a = row ?? [];
            const out = a.slice();
            while (out.length < rightHeader.length) out.push("");
            return out;
        };

        const grid = [];
        for (let i = 0; i < totalRows; i++) {
            const L = (i === 0) ? leftHeader : leftRows[i - 1];
            const R = (i === 0) ? rightHeader : rightRows[i - 1];
            grid.push([...padLeft(L), ...gap, ...padRight(R)]);
        }

        const recTop15 = getRecommendSongsForCSV(50);
        grid.push([]); // 空行
        grid.push(["recommend_top50"]); // 見出し行（任意）
        grid.push(["rank", "songid", "title", "total_Z_value"]);

        recTop15.forEach((s, i) => {
            grid.push([i + 1, s.songid, s.title, s.total_Z_value]);
        });

        const csvContent = grid.map(r => r.join(",")).join("\n");

        const bom = "\uFEFF";
        const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "evaluated_user.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // EnterキーでCSV出力
    document.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            upsertEvaluatedSong(listenSongID);
            exportEvaluatedSongsToCSV();
        }
    });

    $('#loading').fadeOut();


});
