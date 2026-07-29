import React, { useState } from 'react';
import { Camera, UploadCloud, CheckCircle, ArrowRight, ArrowLeft, Loader2, ImagePlus, X, Zap } from 'lucide-react';
import { CATEGORIES, TRANSACTION_TYPES } from '../constants';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import { compressImage } from '../utils/imageCompressor';

export function CreateListingWizard({ onSubmit, onCancel }) {
  const [step, setStep] = useState(1);
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  async function handleImageFileChange(e) {
    const rawFile = e.target.files?.[0];
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
    if (isSubmitting) return;

    const isFree = formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo';
    if (!isFree && (formData.price_mzn === '' || formData.price_mzn === undefined)) {
      showToast('Indique o preço em Meticais (MZN).', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        ...formData,
        price_mzn: isFree ? 0 : Number(formData.price_mzn) || 0,
        images: formData.images.length > 0 ? formData.images : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80']
      });
    } catch (err) {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg mx-auto border border-slate-100 w-full">
      {/* Cabeçalho do Form com Botão Voltar (ArrowLeft) */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Cancelar e Voltar ao Início"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-xs font-bold">Voltar</span>
        </button>

        <h2 className="text-base font-bold text-slate-800">Publicar Novo Material</h2>

        <div className="w-10"></div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                step >= s ? 'bg-ucm-emerald text-white shadow-md' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 mx-2 transition-all ${
                  step > s ? 'bg-ucm-emerald' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Passo 1: Fotos, Título e Descrição */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Passo 1: Fotos e Detalhes</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-ucm-emerald rounded-full border border-emerald-200 flex items-center">
                <Zap className="w-3 h-3 mr-1" /> Otimização Automática
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Fotografias do Material (Toque para tirar foto ou selecionar)
              </label>

              <div className="grid grid-cols-3 gap-3 mb-2">
                {formData.images.map((imgUrl, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 h-24 bg-slate-100">
                    <img src={imgUrl} alt="Preview" className="w-full h-full object-cover" loading="lazy" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {formData.images.length < 4 && (
                  <label className="border-2 border-dashed border-slate-300 hover:border-ucm-emerald rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 hover:bg-emerald-50/50 min-h-[44px]">
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-6 h-6 text-ucm-emerald animate-spin mb-1" />
                        <span className="text-[9px] text-slate-500 font-semibold">A otimizar...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center p-2">
                        <div className="flex items-center space-x-1 mb-1 text-ucm-emerald">
                          <Camera className="w-5 h-5" />
                          <UploadCloud className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">Tirar Foto / Upload</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Título do Artigo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Manual de Análise Matemática / Bata de Laboratório"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descrição Completa *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Descreva o estado do material..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Passo 2: Tipo de Transação (4 Botões Segmentados Lado a Lado), Categoria e Preço */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Passo 2: Tipo de Ação e Valor</h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Tipo de Ação (4 Opções Rápidas)
              </label>
              {/* 4 Botões Lado a Lado (Segmented Buttons) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TRANSACTION_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTransactionTypeChange(t.id)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border text-center flex items-center justify-center min-h-[44px] ${
                      formData.transaction_type === t.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md font-extrabold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-ucm-emerald min-h-[44px]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Preço em Meticais (MZN)</label>
              <input
                type="number"
                disabled={formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo'}
                placeholder={formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo' ? '0 MZN (Grátis)' : 'Ex: 750'}
                value={formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo' ? 0 : formData.price_mzn}
                onChange={(e) => setFormData({ ...formData, price_mzn: e.target.value })}
                className={`w-full p-3 border rounded-xl text-sm min-h-[44px] ${
                  formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo'
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-bold'
                    : 'border-slate-300 focus:ring-2 focus:ring-ucm-emerald focus:outline-none'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Condição do Artigo</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-ucm-emerald min-h-[44px]"
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
            <h2 className="text-xl font-bold text-slate-800">Passo 3: Local de Encontro e Revisão</h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ponto de Encontro Presencial</label>
              <select
                value={formData.campus_location}
                onChange={(e) => setFormData({ ...formData, campus_location: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-ucm-emerald min-h-[44px]"
              >
                <option value="Biblioteca Central">Biblioteca Central - UCM Pemba</option>
                <option value="Faculdade de Gestão">Faculdade de Gestão de Turismo e Informática (FGTI)</option>
                <option value="Cantina Principal">Cantina Principal do Campus</option>
              </select>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <h3 className="font-bold text-slate-700 text-xs uppercase mb-2">Resumo do Anúncio:</h3>
              <p className="text-sm"><strong>Título:</strong> {formData.title}</p>
              <p className="text-sm"><strong>Tipo:</strong> <span className="capitalize">{formData.transaction_type}</span></p>
              <p className="text-sm"><strong>Preço:</strong> {formData.transaction_type === 'doacao' || formData.transaction_type === 'emprestimo' ? '0 MZN (Grátis)' : `${formData.price_mzn} MZN`}</p>
              <p className="text-sm"><strong>Categoria:</strong> {formData.category}</p>
            </div>
          </div>
        )}

        {/* Botões de Ação Principais (Mínimo 44px) */}
        <div className="flex justify-between mt-8 pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-sm min-h-[44px]"
            >
              Cancelar
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center px-6 py-3 bg-ucm-emerald hover:bg-ucm-darkEmerald text-white font-semibold rounded-xl text-sm shadow-md min-h-[44px]"
            >
              Próximo <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center px-6 py-3 font-bold rounded-xl text-sm shadow-lg min-h-[44px] transition-all ${
                isSubmitting
                  ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-ucm-emerald" /> A publicar...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-ucm-emerald" /> Publicar Anúncio
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
