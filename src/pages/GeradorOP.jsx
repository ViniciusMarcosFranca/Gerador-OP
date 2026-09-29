import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Printer, Save } from 'lucide-react';

export default function GeradorOP() {
  const [opTypes, setOpTypes] = useState([]);
  const [lineTypes, setLineTypes] = useState([]);
  const [boardTypes, setBoardTypes] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  
  const [headerData, setHeaderData] = useState({
    op_type_id: '',
    line_type_id: '',
    board_type_id: '',
    observations: ''
  });

  const [opItems, setOpItems] = useState([
    { item_id: '', quantity: 1, itemData: null }
  ]);

  const [opNumber, setOpNumber] = useState(null);

  useEffect(() => {
    async function loadData() {
      const [ops, lines, boards, items] = await Promise.all([
        supabase.from('op_types').select('*'),
        supabase.from('line_types').select('*'),
        supabase.from('board_types').select('*'),
        supabase.from('items').select('*, client:clients(name)')
      ]);
      setOpTypes(ops.data || []);
      setLineTypes(lines.data || []);
      setBoardTypes(boards.data || []);
      setItemsList(items.data || []);
    }
    loadData();
  }, []);

  const selectedOpType = opTypes.find(op => op.id === headerData.op_type_id);
  const selectedLineType = lineTypes.find(lt => lt.id === headerData.line_type_id);
  const selectedBoardType = boardTypes.find(bt => bt.id === headerData.board_type_id);

  const isTela = selectedOpType && (selectedOpType.name.toLowerCase().includes('laminação') || selectedOpType.name.toLowerCase().includes('impressão') || selectedOpType.name.toLowerCase().includes('laminacao') || selectedOpType.name.toLowerCase().includes('impressao'));

  const handleItemSelect = (index, itemId) => {
    const selected = itemsList.find(i => i.id === itemId);
    const newItems = [...opItems];
    newItems[index] = { ...newItems[index], item_id: itemId, itemData: selected };
    setOpItems(newItems);
  };

  const handleQuantityChange = (index, qty) => {
    const newItems = [...opItems];
    newItems[index].quantity = qty;
    setOpItems(newItems);
  };

  const addLine = () => setOpItems([...opItems, { item_id: '', quantity: 1, itemData: null }]);
  const removeLine = (index) => setOpItems(opItems.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!headerData.op_type_id || !headerData.line_type_id || !headerData.board_type_id) {
      alert('Preencha os dados do cabeçalho.'); return;
    }
    const validItems = opItems.filter(i => i.item_id && i.quantity > 0);
    if (validItems.length === 0) {
      alert('Adicione pelo menos um item válido.'); return;
    }

    try {
      const { data: opData, error: opError } = await supabase.from('production_orders').insert([{
        op_type_id: headerData.op_type_id,
        line_type_id: headerData.line_type_id,
        board_type_id: headerData.board_type_id,
        observations: headerData.observations,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }]).select().single();

      if (opError) throw opError;

      const itemsToInsert = validItems.map(i => ({
        production_order_id: opData.id,
        item_id: i.item_id,
        quantity: parseInt(i.quantity)
      }));

      const { error: itemsError } = await supabase.from('production_order_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      setOpNumber(opData.op_number);
      alert('OP gerada com sucesso! Você já pode imprimir.');
    } catch (err) {
      alert('Erro ao gerar OP: ' + err.message);
    }
  };

  const resetForm = () => {
    setHeaderData({ op_type_id: '', line_type_id: '', board_type_id: '', observations: '' });
    setOpItems([{ item_id: '', quantity: 1, itemData: null }]);
    setOpNumber(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 no-print">
        <h1 className="text-2xl font-semibold text-gray-900">Gerador de OP</h1>
        <div className="flex space-x-2">
          {opNumber && (
            <button onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">Nova OP</button>
          )}
          <button onClick={handleSave} disabled={opNumber !== null} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4 mr-2" /> Salvar OP
          </button>
          <button onClick={() => window.print()} disabled={!opNumber} className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:opacity-50">
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </button>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO */}
      <div id="print-area" className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0">
        
        {/* Cabeçalho Impressão */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold uppercase tracking-wider">ORDEM DE PRODUÇÃO</h2>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-500">Nº da OP</p>
              <p className="text-3xl font-bold text-red-600">{opNumber ? String(opNumber).padStart(6, '0') : '------'}</p>
            </div>
          </div>
        </div>

        {/* Formulário / Dados do Cabeçalho */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="no-print">
            <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de OP</label>
            <select className="w-full border p-2 rounded" value={headerData.op_type_id} onChange={e => setHeaderData({...headerData, op_type_id: e.target.value})} disabled={opNumber !== null}>
              <option value="">Selecione...</option>
              {opTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="hidden print:block">
            <p className="text-xs text-gray-500 font-bold uppercase">Processo (Tipo de OP)</p>
            <p className="font-semibold text-lg border-b border-gray-300 pb-1">{selectedOpType?.name || 'N/A'}</p>
          </div>

          <div className="no-print">
            <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Linha</label>
            <select className="w-full border p-2 rounded" value={headerData.line_type_id} onChange={e => setHeaderData({...headerData, line_type_id: e.target.value})} disabled={opNumber !== null}>
              <option value="">Selecione...</option>
              {lineTypes.map(t => <option key={t.id} value={t.id}>{t.name} (Rec: {t.recipe_type})</option>)}
            </select>
          </div>
          <div className="hidden print:block">
            <p className="text-xs text-gray-500 font-bold uppercase">Linha</p>
            <p className="font-semibold text-lg border-b border-gray-300 pb-1">{selectedLineType?.name || 'N/A'}</p>
          </div>
          <div className="hidden print:block">
            <p className="text-xs text-gray-500 font-bold uppercase">Tipo de Receita</p>
            <p className="font-semibold text-lg border-b border-gray-300 pb-1">{selectedLineType?.recipe_type || 'N/A'}</p>
          </div>

          <div className="no-print">
            <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Board</label>
            <select className="w-full border p-2 rounded" value={headerData.board_type_id} onChange={e => setHeaderData({...headerData, board_type_id: e.target.value})} disabled={opNumber !== null}>
              <option value="">Selecione...</option>
              {boardTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="hidden print:block">
            <p className="text-xs text-gray-500 font-bold uppercase">Tipo de Board</p>
            <p className="font-semibold text-lg border-b border-gray-300 pb-1">{selectedBoardType?.name || 'N/A'}</p>
          </div>
        </div>

        {/* Tabela de Itens */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2 uppercase border-b-2 border-gray-800 pb-1">Itens da OP</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-200">
                <th className="p-2 border border-gray-300 text-sm font-bold w-1/5">{isTela ? 'Ref. Tela' : 'Ref. Faca'}</th>
                <th className="p-2 border border-gray-300 text-sm font-bold w-1/6">SKU</th>
                <th className="p-2 border border-gray-300 text-sm font-bold">Descrição do Item</th>
                <th className="p-2 border border-gray-300 text-sm font-bold w-1/6">Cliente</th>
                <th className="p-2 border border-gray-300 text-sm font-bold w-24 text-center">Qtd</th>
                <th className="p-2 border border-gray-300 text-sm font-bold w-10 text-center no-print"></th>
              </tr>
            </thead>
            <tbody>
              {opItems.map((opItem, index) => (
                <tr key={index} className="print:border-b print:border-gray-300">
                  <td className="p-1 border border-gray-300 print:p-2">
                    <span className="hidden print:inline text-sm">
                      {isTela ? (opItem.itemData?.screen_ref || '') : (opItem.itemData?.knife_ref || '')}
                    </span>
                    <select 
                      className="w-full p-1 text-sm bg-transparent border-none no-print outline-none"
                      value={opItem.item_id} 
                      onChange={(e) => handleItemSelect(index, e.target.value)}
                      disabled={opNumber !== null}
                    >
                      <option value="">Selecione o Item...</option>
                      {itemsList.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.sku} - {item.description}
                        </option>
                      ))}
                    </select>
                    {/* Exibir o valor lido na tela para o usuário (modo form) */}
                    {opItem.itemData && (
                       <div className="text-xs text-blue-600 font-semibold no-print mt-1">
                         {isTela ? opItem.itemData.screen_ref : opItem.itemData.knife_ref}
                       </div>
                    )}
                  </td>
                  <td className="p-2 border border-gray-300 text-sm">{opItem.itemData?.sku || ''}</td>
                  <td className="p-2 border border-gray-300 text-sm font-medium">{opItem.itemData?.description || ''}</td>
                  <td className="p-2 border border-gray-300 text-sm">{opItem.itemData?.client?.name || ''}</td>
                  <td className="p-1 border border-gray-300 text-center">
                    <input 
                      type="number" 
                      min="1" 
                      className="w-full text-center p-1 bg-transparent border-none outline-none text-sm print:hidden" 
                      value={opItem.quantity} 
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      disabled={opNumber !== null}
                    />
                    <span className="hidden print:inline text-sm font-bold">{opItem.quantity}</span>
                  </td>
                  <td className="p-1 border border-gray-300 text-center no-print">
                    <button onClick={() => removeLine(index)} disabled={opNumber !== null} className="text-red-500 hover:text-red-700 disabled:opacity-50">
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!opNumber && (
            <button onClick={addLine} className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium no-print">
              <Plus className="w-4 h-4 mr-1" /> Adicionar Linha
            </button>
          )}
        </div>

        {/* Observações */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-1 uppercase">Observações</label>
          <textarea 
            className="w-full border p-2 rounded text-sm print:hidden" 
            rows="3" 
            value={headerData.observations} 
            onChange={e => setHeaderData({...headerData, observations: e.target.value})}
            disabled={opNumber !== null}
          ></textarea>
          <div className="hidden print:block min-h-[60px] p-2 border border-gray-300 text-sm bg-gray-50">
            {headerData.observations || 'Nenhuma observação.'}
          </div>
        </div>

        {/* Assinaturas (Somente Impressão) */}
        <div className="hidden print:flex justify-between mt-16 pt-8">
          <div className="w-1/3 text-center border-t border-gray-800 pt-2 text-sm font-bold">
            Responsável pela Emissão
          </div>
          <div className="w-1/3 text-center border-t border-gray-800 pt-2 text-sm font-bold">
            Responsável pela Produção
          </div>
          <div className="w-1/3 text-center border-t border-gray-800 pt-2 text-sm font-bold">
            Conferência / Qualidade
          </div>
        </div>

      </div>
    </div>
  );
}
