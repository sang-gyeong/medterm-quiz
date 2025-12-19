// src/pages/ImportPage.tsx
import { useMemo, useRef, useState } from 'react';
import { parseTermsCSV } from '../lib/csv';
import type { Term } from '../lib/types';

type UploadedCSV = {
  id: string;
  file: File;
  name: string;
  size: number;
  addedAt: number;

  status: 'ready' | 'parsing' | 'ok' | 'error';
  error?: string;
  terms: Term[];
};

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default function ImportPage({
  onReady,
}: {
  onReady: (terms: Term[], questionCount: number) => void;
}) {
  const [items, setItems] = useState<UploadedCSV[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(20);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const allTerms = useMemo(() => {
    const merged: Term[] = [];
    for (const it of items) {
      if (it.status === 'ok') merged.push(...it.terms);
    }
    return merged;
  }, [items]);

  const totalCount = allTerms.length;
  const canStart = totalCount > 0 && items.some((it) => it.status === 'ok');

  function allowKey(f: File) {
    return `${f.name}__${f.size}__${f.lastModified}`;
  }

  async function parseOne(item: UploadedCSV) {
    setItems((prev) =>
      prev.map((x) =>
        x.id === item.id ? { ...x, status: 'parsing', error: undefined } : x
      )
    );

    try {
      const text = await item.file.text();
      const parsed = parseTermsCSV(text);

      if (!parsed.length) {
        setItems((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? {
                  ...x,
                  status: 'error',
                  error:
                    'CSV에서 용어를 읽지 못했어요. (헤더 en,ko,desc 또는 1~3열 확인)',
                  terms: [],
                }
              : x
          )
        );
        return;
      }

      // ✅ 파일 출처 정보(sourceId/sourceName) 붙이기 + termId 충돌 방지
      const enriched: Term[] = parsed.map((t, i) => ({
        ...t,
        id: `${item.id}_${i}`,
        sourceId: item.id,
        sourceName: item.name,
      }));

      setItems((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, status: 'ok', terms: enriched } : x
        )
      );
    } catch (e) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === item.id
            ? {
                ...x,
                status: 'error',
                error: e?.message || '파일 읽기 실패',
                terms: [],
              }
            : x
        )
      );
    }
  }

  async function addFiles(fileList: FileList | File[]) {
    setGlobalError('');

    const files = Array.from(fileList).filter((f) => {
      const okExt = f.name.toLowerCase().endsWith('.csv');
      const okType =
        f.type === 'text/csv' ||
        f.type === 'application/vnd.ms-excel' ||
        f.type === '';
      return okExt || okType;
    });

    if (!files.length) {
      setGlobalError('CSV 파일만 업로드할 수 있어요.');
      return;
    }

    // 같은 이름+사이즈+수정일 파일은 중복으로 안 받기
    const existingKey = new Set(items.map((it) => allowKey(it.file)));
    const toAdd = files.filter((f) => !existingKey.has(allowKey(f)));

    if (!toAdd.length) {
      setGlobalError('이미 업로드된 파일입니다.');
      return;
    }

    const newItems: UploadedCSV[] = toAdd.map((f) => ({
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      file: f,
      name: f.name,
      size: f.size,
      addedAt: Date.now(),
      status: 'ready',
      terms: [],
    }));

    setItems((prev) => [...prev, ...newItems]);

    // 추가된 파일들 자동 파싱
    for (const it of newItems) {
      await parseOne(it);
    }
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function clearAll() {
    setItems([]);
    setGlobalError('');
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  function startGame() {
    if (!canStart) return;
    onReady(allTerms, questionCount);
  }

  const warning =
    canStart && questionCount > totalCount * 2
      ? '문제 수가 (뜻/설명 조합)보다 많아서 중복 출제가 꽤 생길 수 있어요.'
      : canStart && questionCount > totalCount
      ? '문제 수가 용어 수보다 많으면 일부는 중복 출제됩니다.'
      : '';

  return (
    <div className="mt-row">
      <div className="mt-card">
        <div className="mt-card-inner">
          <div className="mt-row">
            <div>
              <div className="mt-section-title">CSV 업로드</div>
              <div className="mt-help" style={{ marginTop: 6 }}>
                여러 파일 업로드 가능. <code>en,ko,desc</code> 헤더 권장 (쉼표
                구분).
              </div>
            </div>

            {/* 문제 개수 */}
            <div className="mt-grid-2">
              <div className="mt-status">
                <div>🎯</div>
                <div>
                  <div
                    style={{ fontWeight: 750, color: 'rgba(255,255,255,0.88)' }}
                  >
                    문제 개수
                  </div>
                  <div className="mt-help" style={{ marginTop: 4 }}>
                    원하는 문제 수를 입력하세요. (파일별로 최대한 골고루 출제)
                  </div>
                </div>
              </div>

              <div>
                <input
                  className="mt-input"
                  type="number"
                  min={1}
                  step={1}
                  value={Number.isFinite(questionCount) ? questionCount : 1}
                  onChange={(e) =>
                    setQuestionCount(
                      Math.max(1, Math.floor(Number(e.target.value || 1)))
                    )
                  }
                  placeholder="예: 30"
                />
                <div className="mt-help" style={{ marginTop: 8 }}>
                  현재 로드된 용어: <b>{totalCount}</b>개
                  {warning && (
                    <div style={{ marginTop: 6, opacity: 0.9 }}>
                      ⚠️ {warning}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dropzone */}
            <div
              className="mt-card"
              style={{
                boxShadow: 'none',
                borderStyle: 'dashed',
                borderWidth: 1,
                borderColor: isDragging
                  ? 'rgba(167, 139, 250, 0.85)'
                  : 'rgba(255,255,255,0.18)',
                background: isDragging
                  ? 'rgba(124,58,237,0.12)'
                  : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
              }}
              onClick={openPicker}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer?.files?.length)
                  addFiles(e.dataTransfer.files);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openPicker();
              }}
            >
              <div className="mt-card-inner" style={{ padding: 18 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>
                    {isDragging
                      ? '여기에 놓으면 업로드됩니다'
                      : '드래그 앤 드롭으로 CSV 업로드'}
                  </div>
                  <div className="mt-help">
                    또는 클릭해서 파일 선택 (여러 파일 선택 가능)
                  </div>

                  <div className="mt-actions" style={{ marginTop: 6 }}>
                    <button
                      className="mt-btn mt-btn-primary"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPicker();
                      }}
                    >
                      파일 선택
                    </button>

                    <span className="mt-pill">
                      총 용어 <b>{totalCount}</b>개
                    </span>
                    {items.length > 0 && (
                      <span className="mt-pill">
                        파일 <b>{items.length}</b>개
                      </span>
                    )}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const fl = e.target.files;
                    if (fl && fl.length) addFiles(fl);
                    e.currentTarget.value = '';
                  }}
                />
              </div>
            </div>

            {globalError && (
              <div className="mt-status bad">
                <div>⚠️</div>
                <div>{globalError}</div>
              </div>
            )}

            {/* 업로드 파일 목록 */}
            {items.length > 0 && (
              <div className="mt-row">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div className="mt-section-title">업로드된 파일</div>
                  <button
                    className="mt-btn mt-btn-ghost"
                    type="button"
                    onClick={clearAll}
                  >
                    전체 삭제
                  </button>
                </div>

                <div className="mt-row" style={{ gap: 10 }}>
                  {items
                    .slice()
                    .sort((a, b) => b.addedAt - a.addedAt)
                    .map((it) => {
                      const statusLabel =
                        it.status === 'parsing'
                          ? '파싱 중…'
                          : it.status === 'ok'
                          ? `${it.terms.length}개 로드됨`
                          : it.status === 'error'
                          ? '실패'
                          : '대기';

                      const statusClass =
                        it.status === 'ok'
                          ? 'good'
                          : it.status === 'error'
                          ? 'bad'
                          : '';

                      return (
                        <div
                          key={it.id}
                          className="mt-item"
                          style={{ display: 'grid', gap: 8 }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              alignItems: 'flex-start',
                            }}
                          >
                            <div style={{ display: 'grid', gap: 4 }}>
                              <div style={{ fontWeight: 750 }}>
                                {it.name}{' '}
                                <span
                                  style={{
                                    fontSize: 12,
                                    opacity: 0.65,
                                    fontWeight: 500,
                                  }}
                                >
                                  · {fmtBytes(it.size)}
                                </span>
                              </div>

                              <div
                                className={`mt-status ${statusClass}`}
                                style={{ padding: '8px 10px' }}
                              >
                                <div>
                                  {it.status === 'ok'
                                    ? '✅'
                                    : it.status === 'error'
                                    ? '⚠️'
                                    : '⏳'}
                                </div>
                                <div style={{ display: 'grid', gap: 4 }}>
                                  <div>{statusLabel}</div>
                                  {it.error && (
                                    <div style={{ opacity: 0.9 }}>
                                      {it.error}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div
                              className="mt-actions"
                              style={{ justifyContent: 'flex-end' }}
                            >
                              {it.status === 'error' && (
                                <button
                                  className="mt-btn"
                                  type="button"
                                  onClick={() => parseOne(it)}
                                >
                                  재시도
                                </button>
                              )}
                              <button
                                className="mt-btn"
                                type="button"
                                onClick={() => removeItem(it.id)}
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="mt-divider" />

            <div className="mt-actions">
              <button
                className="mt-btn mt-btn-primary"
                disabled={!canStart}
                onClick={startGame}
              >
                게임 시작 ({questionCount}문제)
              </button>
              <span className="mt-help">
                * 파일별로 최대한 골고루 문제를 냅니다.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
