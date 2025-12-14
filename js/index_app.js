$(function () {
  const JSON_URL = 'data/all_song_data.json';

  let allSongs = [];
  let top150 = [];

  $.getJSON(JSON_URL, { _: Date.now() }).done(function (data) {
    const ids = Object.keys(data);
    allSongs = ids.map(id => {
      const s = data[id] || {};
      const title  = (s.title  || id).trim();
      const writer = (s.writer || '').trim();
      return {
        id,                 // ← 実ID（URL遷移用に保持）
        text: title,        // ← 表示はタイトルのみ
        // 🔽 検索用文字列：タイトル＋作者のみ（IDは含めない）
        _needle: (title + ' ' + writer).toLowerCase()
      };
    });

    top150 = allSongs.slice(0, 150);

    $('#id_song').select2({
      width: '100%',
      placeholder: '--- 楽曲を選択してください ---',
      allowClear: true,
      minimumInputLength: 0,
      ajax: {
        delay: 0,
        cache: true,
        data: params => ({ q: (params.term || '').trim() }),
        transport: function (params, success) {
          const q = (params.data.q || '').toLowerCase();
          const results = !q
            ? top150
            : allSongs.filter(o => o._needle.includes(q)).slice(0, 500);
          success({ results });
        },
        processResults: data => data
      },
      templateResult: item => item.text || '',
      templateSelection: item => item.text || ''
    });
  }).fail(function () {
    alert('all_song_data.json の読み込みに失敗しました');
  });

  $('#Pattern1').on('click', function () {
    const songId = $('#id_song').val();
    if (!songId) return alert('楽曲を選択してください');
    const url = `map.html?song_id=${encodeURIComponent(songId)}&map_type=umap&toleranceSetting=Each&concatType=AllPattern`;
    window.location.href = url;
  });

  $('#Pattern2').on('click', function () {
    const songId = $('#id_song').val();
    if (!songId) return alert('楽曲を選択してください');
    const url = `map.html?song_id=${encodeURIComponent(songId)}&map_type=umap&toleranceSetting=All&concatType=AllPattern`;
    window.location.href = url;
  });

  $('#Pattern3').on('click', function () {
    const songId = $('#id_song').val();
    if (!songId) return alert('楽曲を選択してください');
    const url = `map.html?song_id=${encodeURIComponent(songId)}&map_type=umap&toleranceSetting=Each&concatType=MaxMin`;
    window.location.href = url;
  });

    $('#Pattern4').on('click', function () {
    const songId = $('#id_song').val();
    if (!songId) return alert('楽曲を選択してください');
    const url = `map.html?song_id=${encodeURIComponent(songId)}&map_type=umap&toleranceSetting=All&concatType=MaxMin`;
    window.location.href = url;
  });

});