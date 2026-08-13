import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, CheckCircle, ArrowRight, ArrowLeft, Loader2, X, Zap, Sparkles, Image as ImageIcon } from 'lucide-react';
import { CATEGORIES, TRANSACTION_TYPES } from '../constants';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import { compressImage } from '../utils/imageCompressor';
import { CameraModal } from './CameraModal';

export function CreateListingWizard({ onSubmit, onCancel }) {
  const [step, setStep] = useState(1);
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const submittingRef = useRef(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Manuais e Livros',
    condition: 'Usado - Excelente',
    price_mzn: '',
    transaction_type: 'venda',
    course: 'Licenciatura em Tecnologias da Informação',
    campus_location: 'Biblioteca Central',
    images: []
  });

  function handleTransactionTypeChange(type) {
    const isFree = type === 'doacao' || type === 'emprestimo';
    setFormData((prev) => ({
      ...prev,
      transaction_type: type,
      price_mzn: isFree ? 0 : prev.price_mzn
    }));
  }

  async function processAndUploadFile(rawFile) {
    if (!rawFile) return;

    try {
      setUploading(true);
      const compressedFile = await compressImage(rawFile, 1024, 1024, 0.8);
      let publicUrl = null;

      const fileName = `anuncios/${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('listing-images')
        .upload(fileName, compressedFile, {
          contentType: 'image/webp',
          upsert: true
        });

      if (!storageErr && storageData) {
        const { data: urlData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      } else {
        const bodyData = new FormData();
        bodyData.append('image', compressedFile);

        const response = await fetch('/api/v1/upload/image', {
          method: 'POST',
          body: bodyData
        });
        const res = await response.json();
        if (res.success && res.data?.url) {
          publicUrl = res.data.url;
        }
      }

      if (publicUrl) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, publicUrl]
        }));
        showToast('Foto otimizada e carregada com sucesso!', 'success');
      } else {
        throw new Error('Não foi possível obter o URL da imagem.');
      }
    } catch (err) {
      showToast(err.message || 'Erro ao carregar a imagem.', 'error');
    } finally {
      setUploading(false);
    }
  }

  function handleImageFileChange(e) {
    const rawFile = e.target.files?.[0];
    if (rawFile) processAndUploadFile(rawFile);
  }

  function removeImage(index) {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  }

  function nextStep() {
    if (step === 1) {
      if (!formData.title.trim() || !formData.description.trim()) {
        showToast('Preencha o título e a descrição para avançar.', 'warning');
        return;
      }
    }
    if (step < 3) setStep(step + 1);
  }

  function prevStep() {
    if (step > 1) setStep(step - 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current || isSubmitting) return;

    const isFree = formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo';
    if (!isFree && (formData.price_mzn === '' || formData.price_mzn === undefined)) {
      showToast('Indique o preço em Meticais (MZN).', 'warning');
      return;
    }

    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      await onSubmit({
        ...formData,
        price_mzn: isFree ? 0 : Number(formData.price_mzn) || 0,
        images: formData.images.length > 0 ? formData.images : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80']
      });
    } catch (err) {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl rounded-none p-4 sm:p-6 shadow-2xl border-0 sm:border sm:border-slate-100 flex flex-col justify-between overflow-y-auto scrollbar-thin">
      {/* Cabeçalho Fixo do Form com Botão Voltar */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 sticky top-0 bg-white z-20 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-platinum rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Cancelar e Voltar ao Início"
        >
          <ArrowLeft className="w-5 h-5 mr-1 text-persian" />
          <span className="text-xs font-black">Voltar</span>
        </button>

        <h2 className="text-base font-black text-slate-900 tracking-tight text-center">
          Publicar Material
        </h2>

        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar Otimizada para Mobile */}
      <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-5 shrink-0">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                step >= s ? 'bg-persian text-white shadow-md shadow-persian/30' : 'bg-platinum text-slate-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-10 sm:w-16 h-1 mx-1.5 rounded-full transition-all ${
                  step > s ? 'bg-persian' : 'bg-platinum'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Corpo do Formulário flexível */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 justify-between space-y-4">
        <div className="flex-1 space-y-4">
          {/* Passo 1: Fotos, Título e Descrição */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Passo 1: Fotos e Detalhes</h3>
                <span className="text-[10px] font-extrabold px-2.5 py-1 bg-persian-light text-persian rounded-full border border-persian/20 flex items-center shrink-0">
                  <Zap className="w-3 h-3 mr-1 text-carrot" /> Foto Otimizada
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-extrabold text-slate-800">
                    Fotografias do Material ({formData.images.length}/4)
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">Opcional, mas recomendado</span>
                </div>

                {/* Pré-visualizações das imagens adicionadas */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {formData.images.map((imgUrl, idx) => (
                      <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 h-20 bg-slate-100 shadow-xs">
                        <img src={imgUrl} alt="Preview" className="w-full h-full object-cover" loading="lazy" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full transition-colors min-h-[26px] min-w-[26px] flex items-center justify-center"
                          title="Remover foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Painel de Ações de Upload / Câmera */}
                {formData.images.length < 4 && (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-persian rounded-2xl p-3.5 transition-all">
                    {uploading ? (
                      <div className="flex flex-col items-center justify-center py-3">
                        <Loader2 className="w-6 h-6 text-persian animate-spin mb-1.5" />
                        <span className="text-xs font-bold text-slate-700">A otimizar e carregar fotografia...</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-bold text-slate-600 text-center">
                          Adicione fotos do seu material com a Câmera ou da Galeria:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Opção 1: Tirar Foto com Câmera */}
                          <button
                            type="button"
                            onClick={() => setIsCameraOpen(true)}
                            className="py-3 px-4 bg-persian hover:bg-persian-hover text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 shadow-md shadow-persian/20 transition-all active:scale-95 min-h-[46px]"
                          >
                            <Camera className="w-5 h-5 text-carrot" />
                            <span>Tirar Foto com Câmera</span>
                          </button>

                          {/* Opção 2: Escolher da Galeria */}
                          <label className="py-3 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-all active:scale-95 min-h-[46px]">
                            <ImageIcon className="w-5 h-5 text-persian" />
                            <span>Escolher da Galeria</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileChange}
                              disabled={uploading}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Título do Artigo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Manual de Análise Matemática / Bata de Laboratório"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3.5 border border-slate-300 rounded-2xl text-base sm:text-sm focus:ring-2 focus:ring-persian focus:outline-none min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Descrição Completa *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Descreva o estado do material (páginas, conservação, etc.)..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3.5 border border-slate-300 rounded-2xl text-base sm:text-sm focus:ring-2 focus:ring-persian focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Passo 2: Tipo de Transação, Categoria e Preço */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Passo 2: Tipo de Ação e Valor</h3>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-2">
                  Tipo de Ação (Selecione uma opção)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TRANSACTION_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTransactionTypeChange(t.id)}
                      className={`py-3.5 px-3 rounded-2xl text-xs font-black transition-all border text-center flex items-center justify-center min-h-[48px] ${
                        formData.transaction_type === t.id
                          ? 'bg-persian text-white border-persian shadow-md shadow-persian/20'
                          : 'bg-platinum text-slate-700 border-slate-300/80 hover:bg-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-3.5 border border-slate-300 rounded-2xl text-base sm:text-sm focus:ring-2 focus:ring-persian min-h-[48px]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Preço em Meticais (MZN)</label>
                <input
                  type="number"
                  disabled={formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo'}
                  placeholder={formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo' ? '0 MZN (Grátis)' : 'Ex: 750'}
                  value={formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo' ? 0 : formData.price_mzn}
                  onChange={(e) => setFormData({ ...formData, price_mzn: e.target.value })}
                  className={`w-full p-3.5 border rounded-2xl text-base sm:text-sm min-h-[48px] ${
                    formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo'
                      ? 'bg-platinum text-carrot border-slate-300 cursor-not-allowed font-extrabold'
                      : 'border-slate-300 focus:ring-2 focus:ring-persian focus:outline-none'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Condição do Artigo</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full p-3.5 border border-slate-300 rounded-2xl text-base sm:text-sm focus:ring-2 focus:ring-persian min-h-[48px]"
                >
                  <option value="Novo">Novo</option>
                  <option value="Usado - Excelente">Usado - Excelente</option>
                  <option value="Usado - Bom">Usado - Bom</option>
                  <option value="Usado - Aceitável">Usado - Aceitável</option>
                </select>
              </div>
            </div>
          )}

          {/* Passo 3: Local de Encontro e Revisão */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Passo 3: Local de Encontro e Revisão</h3>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Ponto de Encontro Presencial</label>
                <select
                  value={formData.campus_location}
                  onChange={(e) => setFormData({ ...formData, campus_location: e.target.value })}
                  className="w-full p-3.5 border border-slate-300 rounded-2xl text-base sm:text-sm focus:ring-2 focus:ring-persian min-h-[48px]"
                >
                  <option value="Biblioteca Central">Biblioteca Central - UCM Pemba</option>
                  <option value="Faculdade de Gestão">Faculdade de Gestão de Turismo e Informática (FGTI)</option>
                  <option value="Cantina Principal">Cantina Principal do Campus</option>
                </select>
              </div>

              <div className="p-4 bg-platinum/70 rounded-2xl border border-slate-200 space-y-1.5">
                <h4 className="font-black text-slate-800 text-xs uppercase mb-2 flex items-center">
                  <Sparkles className="w-4 h-4 mr-1 text-carrot" /> Resumo do Anúncio:
                </h4>
                <p className="text-xs text-slate-700"><strong>Título:</strong> {formData.title}</p>
                <p className="text-xs text-slate-700"><strong>Tipo:</strong> <span className="capitalize font-bold text-persian">{formData.transaction_type}</span></p>
                <p className="text-xs text-slate-700"><strong>Preço:</strong> <span className="font-extrabold text-slate-900">{formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo' ? '0 MZN (Grátis)' : `${formData.price_mzn} MZN`}</span></p>
                <p className="text-xs text-slate-700"><strong>Categoria:</strong> {formData.category}</p>
              </div>
            </div>
          )}
        </div>

        {/* Barra Ficha de Ações Fixo em Baixo no Mobile */}
        <div className="flex justify-between items-center mt-6 pt-4 pb-4 sm:pb-0 border-t border-slate-100 gap-3 sticky bottom-0 bg-white z-20 shrink-0 shadow-xs">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center px-4 py-3.5 bg-platinum hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs min-h-[48px]"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Anterior
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3.5 bg-platinum hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs min-h-[48px]"
            >
              Cancelar
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center px-6 py-3.5 bg-persian hover:bg-persian-hover text-white font-extrabold rounded-2xl text-xs shadow-md shadow-persian/30 min-h-[48px]"
            >
              <span>Próximo</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center px-6 py-3.5 font-black rounded-2xl text-xs shadow-lg min-h-[48px] transition-all ${
                isSubmitting
                  ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                  : 'bg-persian hover:bg-persian-hover text-white shadow-persian/40'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-carrot" /> A publicar...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-carrot" /> Publicar Anúncio
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Modal de Captura de Câmera em Tempo Real */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={processAndUploadFile}
      />
    </div>
  );
}
