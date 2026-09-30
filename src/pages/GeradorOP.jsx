import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Printer, Save, Factory } from 'lucide-react';

export default function GeradorOP() {
  const [opTypes, setOpTypes] = useState([]);
  const [lineTypes, setLineTypes] = useState([]);
  const [boardTypes, setBoardTypes] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [headerData, setHeaderData] = useState({
    op_type_id: '',
    line_type_id: '',
    board_type_id: '',
    observations: '',
    data_solicitacao: new Date().toISOString().split('T')[0],
    previsao_entrega: '',
  });

  const [opItems, setOpItems] = useState([
    { item_id: '', quantity: 1, itemData: null }
  ]);

  const [opNumber, setOpNumber] = useState(null);
  const [activeTab, setActiveTab] = useState('LAMINAÇÃO'); // LAMINAÇÃO, CNC, QUALIDADE, ETIQUETADORA

  useEffect(() => {
    async function loadData() {
      const [ops, lines, boards, items, user] = await Promise.all([
        supabase.from('op_types').select('*'),
        supabase.from('line_types').select('*'),
        supabase.from('board_types').select('*'),
        supabase.from('items').select('*, client:clients(name)'),
        supabase.auth.getUser()
      ]);
      setOpTypes(ops.data || []);
      setLineTypes(lines.data || []);
      setBoardTypes(boards.data || []);
      setItemsList(items.data || []);
      setCurrentUser(user.data?.user?.user_metadata?.name || user.data?.user?.email?.split('@')[0] || 'Usuário');
    }
    loadData();
  }, []);

  const selectedLineType = lineTypes.find(lt => lt.id === headerData.line_type_id);
  const recipeParts = (selectedLineType?.recipe_type || '').split('-').map(s => s.trim());

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
      alert('OP gerada com sucesso! Navegue pelas abas abaixo e imprima os relatórios.');
    } catch (err) {
      alert('Erro ao gerar OP: ' + err.message);
    }
  };

  const resetForm = () => {
    setHeaderData({ ...headerData, op_type_id: '', line_type_id: '', board_type_id: '', observations: '' });
    setOpItems([{ item_id: '', quantity: 1, itemData: null }]);
    setOpNumber(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  };

  const opNumberFormatted = opNumber ? `C${String(opNumber).padStart(6, '0')}` : 'C------';

  // --- COMPONENTES DE IMPRESSÃO ---

  const PrintHeader = ({ title }) => (
    <div className="w-full mb-2 font-sans border-2 border-black bg-white text-black">
      {/* Linha Superior Amarela */}
      <div className="flex w-full bg-yellow-300 border-b-2 border-black">
        <div className="w-48 border-r-2 border-black font-bold text-lg p-1 text-center">
          Nº {opNumberFormatted}
        </div>
        <div className="flex-1 font-bold text-xl p-1 text-center uppercase">
          ORDEM DE PRODUÇÃO PARA {title}
        </div>
      </div>

      {/* Bloco de Informações */}
      <div className="flex w-full text-[11px] font-bold">
        {/* Logo */}
        <div className="w-48 flex flex-col items-center justify-center p-2 border-r-2 border-black">
          <Factory className="w-8 h-8 mb-1" />
          <span className="tracking-widest">FÁBRICA DE</span>
          <span className="text-lg tracking-widest leading-none">PELÍCULA</span>
        </div>

        {/* Info Central */}
        <div className="flex-1 flex flex-col">
          <div className="flex border-b border-black">
            <div className="w-1/3 p-1 text-right border-r border-black font-normal">Data da Solicitação:</div>
            <div className="w-2/3 p-1 text-center">{formatDate(headerData.data_solicitacao)}</div>
          </div>
          <div className="flex border-b border-black">
            <div className="w-1/3 p-1 text-right border-r border-black font-normal">Previsão de entrega até:</div>
            <div className="w-2/3 p-1 text-center">{formatDate(headerData.previsao_entrega)}</div>
          </div>
          <div className="flex border-b border-black">
            <div className="w-1/3 p-1 text-right border-r border-black font-normal">Solicitante:</div>
            <div className="w-2/3 p-1 text-center">{currentUser}</div>
          </div>
          <div className="flex border-b border-black bg-blue-200">
            <div className="w-1/3 p-1 text-left font-normal pl-2" colSpan="2">Data Recebimento Estoque:</div>
            <div className="w-2/3 p-1"></div>
          </div>
          <div className="flex bg-blue-200">
            <div className="w-1/3 p-1 text-left font-normal pl-2" colSpan="2">Responsável:</div>
            <div className="w-2/3 p-1"></div>
          </div>
        </div>

        {/* Bloco Direito */}
        <div className="w-64 flex flex-col border-l-2 border-black">
          <div className="flex h-10 border-b border-black">
            <div className="w-1/3 bg-yellow-200 p-1 flex flex-col items-center justify-center border-r border-black text-[10px]">
              <span>PRODUÇÃO</span>
              <span>INTERNA</span>
            </div>
            <div className="w-2/3 bg-yellow-200 p-1 flex items-center justify-center">
              {selectedLineType?.name || 'LINHA NÃO SELECIONADA'}
            </div>
          </div>
          <div className="flex-1 bg-yellow-200 p-1 flex flex-col text-red-600">
            <span className="text-[10px] underline mb-1">OBS:</span>
            <span className="text-xs">{headerData.observations}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const TableIndustrial = ({ titleSection1, titleSection2 }) => (
    <div className="w-full">
      {/* Títulos das seções da tabela */}
      <div className="flex w-full text-[10px] font-bold mb-1">
        <div className="flex-1 text-center">{titleSection1}</div>
        <div className="w-96 text-center">{titleSection2}</div>
      </div>
      
      <table className="w-full text-center border-collapse text-[9px] border-2 border-black">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-black p-1" rowSpan="2">Prioridade</th>
            <th className="border border-black p-1" rowSpan="2">Ref. tela</th>
            <th className="border border-black p-1" rowSpan="2">Ref. Faca</th>
            <th className="border border-black p-1" rowSpan="2">INDUSTRIAL</th>
            <th className="border border-black p-1 w-[280px]" rowSpan="2">Modelo</th>
            <th className="border border-black p-1" rowSpan="2">CLIENTE</th>
            <th className="border border-black p-1" colSpan="5">CAMADAS DE LAMINAÇÕES<br/>SEQUÊNCIA DE CIMA PARA BAIXO</th>
            <th className="border border-black p-1" rowSpan="2">QTDE<br/>PEDIDO</th>
            <th className="border border-black p-1" rowSpan="2">QTDE A<br/>PRODUZIR</th>
            <th className="border border-black p-1" rowSpan="2">METROS<br/>CONTADOR<br/>LAMINADORA</th>
            <th className="border border-black p-1" rowSpan="2">Nº DE<br/>CARTELAS<br/>GUILHOTINA</th>
            <th className="border border-black p-1" rowSpan="2">Largura da<br/>Bobina<br/>MINIMA</th>
            <th className="border border-black p-1" rowSpan="2">AB</th>
            <th className="border border-black p-1 w-16" rowSpan="2">Quantidade e<br/>total laminada<br/>(metros)</th>
            <th className="border border-black p-1 w-16" rowSpan="2">Quantidade<br/>perdida em<br/>processo</th>
            <th className="border border-black p-1 w-16" rowSpan="2">Motivo da<br/>perda</th>
          </tr>
          <tr className="bg-gray-50">
            <th className="border border-black p-1 w-8">1º</th>
            <th className="border border-black p-1 w-8">2º</th>
            <th className="border border-black p-1 w-8">3º</th>
            <th className="border border-black p-1 w-8">4º</th>
            <th className="border border-black p-1 w-8">5º</th>
          </tr>
        </thead>
        <tbody>
          {opItems.map((item, index) => {
            if (!item.item_id) return null;
            return (
              <tr key={index}>
                <td className="border border-black p-2 font-bold text-sm">{index + 1}</td>
                <td className="border border-black p-1 font-bold">{item.itemData?.screen_ref || ''}</td>
                <td className="border border-black p-1 font-bold">{item.itemData?.knife_ref || ''}</td>
                <td className="border border-black p-1 font-bold">{item.itemData?.sku || ''}</td>
                <td className="border border-black p-1 font-bold text-[10px] text-left">{item.itemData?.description || ''}</td>
                <td className="border border-black p-1 font-bold text-red-600">{item.itemData?.client?.name || ''}</td>
                <td className="border border-black p-1">{recipeParts[0] || ''}</td>
                <td className="border border-black p-1">{recipeParts[1] || ''}</td>
                <td className="border border-black p-1">{recipeParts[2] || ''}</td>
                <td className="border border-black p-1">{recipeParts[3] || ''}</td>
                <td className="border border-black p-1">{recipeParts[4] || ''}</td>
                <td className="border border-black p-1 font-bold text-sm">{item.quantity}</td>
                <td className="border border-black p-1 font-bold text-blue-800 text-sm">{Math.ceil(item.quantity * 1.1)}</td>
                <td className="border border-black p-1 font-bold text-sm">{(((Math.ceil(item.quantity * 1.1) / 6) * 350) / 1000).toFixed(2)}</td>
                <td className="border border-black p-1 font-bold text-sm">{Math.ceil(Math.ceil(item.quantity * 1.1) / 6)}</td>
                <td className="border border-black p-1 text-red-600 font-bold">{item.itemData?.min_coil_width || ''}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
            );
          })}
          {opItems.filter(i => i.item_id).length === 0 && (
            <tr><td colSpan="21" className="p-4">Nenhum item adicionado.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const TableEtiquetadora = () => (
    <div className="w-full">
      <div className="flex w-full text-[10px] font-bold mb-1 justify-end">
        <div className="w-1/2 text-center">PREENCHIMENTO ETIQUETADORA</div>
      </div>
      
      <table className="w-full text-center border-collapse text-[9px] border-2 border-black">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-black p-1" rowSpan="2">INDUSTRIAL</th>
            <th className="border border-black p-1 w-[280px]" rowSpan="2">Modelo</th>
            <th className="border border-black p-1" rowSpan="2">CLIENTE</th>
            <th className="border border-black p-1" rowSpan="2">QTDE<br/>PEDIDO</th>
            <th className="border border-black p-1" colSpan="10">QUANTIDADES POR LOTE</th>
            <th className="border border-black p-1" rowSpan="2">QUANTIDADE<br/>TOTAL</th>
          </tr>
          <tr className="bg-gray-50">
            <th className="border border-black p-1 w-10">1º</th>
            <th className="border border-black p-1 w-10">2º</th>
            <th className="border border-black p-1 w-10">3º</th>
            <th className="border border-black p-1 w-10">4º</th>
            <th className="border border-black p-1 w-10">5º</th>
            <th className="border border-black p-1 w-10">6º</th>
            <th className="border border-black p-1 w-10">7º</th>
            <th className="border border-black p-1 w-10">8º</th>
            <th className="border border-black p-1 w-10">9º</th>
            <th className="border border-black p-1 w-10">10º</th>
          </tr>
        </thead>
        <tbody>
          {opItems.map((item, index) => {
            if (!item.item_id) return null;
            return (
              <tr key={index}>
                <td className="border border-black p-1 font-bold">{item.itemData?.sku || ''}</td>
                <td className="border border-black p-1 font-bold text-[10px] text-left">{item.itemData?.description || ''}</td>
                <td className="border border-black p-1 font-bold text-red-600">{item.itemData?.client?.name || ''}</td>
                <td className="border border-black p-1 font-bold text-sm">{item.quantity}</td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
              </tr>
            );
          })}
          {opItems.filter(i => i.item_id).length === 0 && (
            <tr><td colSpan="16" className="p-4">Nenhum item adicionado.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* --- MODO EDIÇÃO (Não imprimível) --- */}
      <div className="no-print mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Gerador de OP</h1>
          <div className="flex space-x-2">
            {opNumber && (
              <button onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium">Nova OP</button>
            )}
            <button onClick={handleSave} disabled={opNumber !== null} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">
              <Save className="w-4 h-4 mr-2" /> Salvar OP
            </button>
            <button onClick={() => window.print()} disabled={!opNumber} className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-bold shadow-md">
              <Printer className="w-5 h-5 mr-2" /> Imprimir Relatório Atual
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-medium mb-4 border-b pb-2">1. Dados do Cabeçalho</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de OP</label>
              <select className="w-full border border-gray-300 p-2 rounded-md" value={headerData.op_type_id} onChange={e => setHeaderData({...headerData, op_type_id: e.target.value})} disabled={opNumber !== null}>
                <option value="">Selecione...</option>
                {opTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Linha</label>
              <select className="w-full border border-gray-300 p-2 rounded-md" value={headerData.line_type_id} onChange={e => setHeaderData({...headerData, line_type_id: e.target.value})} disabled={opNumber !== null}>
                <option value="">Selecione...</option>
                {lineTypes.map(t => <option key={t.id} value={t.id}>{t.name} (Rec: {t.recipe_type})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Board</label>
              <select className="w-full border border-gray-300 p-2 rounded-md" value={headerData.board_type_id} onChange={e => setHeaderData({...headerData, board_type_id: e.target.value})} disabled={opNumber !== null}>
                <option value="">Selecione...</option>
                {boardTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Previsão</label>
              <input type="date" className="w-full border border-gray-300 p-2 rounded-md" value={headerData.previsao_entrega} onChange={e => setHeaderData({...headerData, previsao_entrega: e.target.value})} disabled={opNumber !== null} />
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações (Impressas na OP)</label>
              <input type="text" className="w-full border border-gray-300 p-2 rounded-md" value={headerData.observations} onChange={e => setHeaderData({...headerData, observations: e.target.value})} disabled={opNumber !== null} placeholder="Digite alguma observação se necessário..." />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium mb-4 border-b pb-2">2. Itens da Produção</h2>
          <div className="space-y-3">
            {opItems.map((opItem, index) => (
              <div key={index} className="flex gap-4 items-end bg-gray-50 p-3 rounded-md border border-gray-200">
                <div className="w-12 text-center font-bold text-gray-500">{index + 1}</div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Selecione o Item (SKU - Descrição)</label>
                  <select 
                    className="w-full border border-gray-300 p-2 rounded-md text-sm"
                    value={opItem.item_id} 
                    onChange={(e) => handleItemSelect(index, e.target.value)}
                    disabled={opNumber !== null}
                  >
                    <option value="">Buscar item...</option>
                    {itemsList.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Qtd Pedido</label>
                  <input 
                    type="number" min="1" 
                    className="w-full border border-gray-300 p-2 rounded-md text-center" 
                    value={opItem.quantity} 
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    disabled={opNumber !== null}
                  />
                </div>
                <div className="w-12 flex justify-center pb-2">
                  <button onClick={() => removeLine(index)} disabled={opNumber !== null} className="text-red-500 hover:text-red-700 disabled:opacity-50">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!opNumber && (
            <button onClick={addLine} className="mt-4 text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium">
              <Plus className="w-4 h-4 mr-1" /> Adicionar mais um item
            </button>
          )}
        </div>
      </div>

      {/* --- TABS DE VISUALIZAÇÃO / IMPRESSÃO --- */}
      {opNumber && (
        <div className="no-print mt-8 mb-4">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Visualização de Relatórios (Prontos para Imprimir)</h2>
          <div className="flex space-x-2 border-b border-gray-300 pb-px">
            {['LAMINAÇÃO', 'CNC', 'QUALIDADE', 'ETIQUETADORA'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-bold text-sm rounded-t-lg border-t border-l border-r transition-colors ${
                  activeTab === tab 
                    ? 'bg-white border-gray-300 text-blue-600 border-b-transparent shadow-[0_-2px_4px_rgba(0,0,0,0.05)] relative top-[1px]' 
                    : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'
                }`}
              >
                Relatório de {tab}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- ÁREA DE IMPRESSÃO (Renderiza apenas a aba ativa) --- */}
      <div id="print-area" className={`bg-white p-4 ${opNumber ? 'border border-gray-300 rounded-b-lg shadow-sm' : 'hidden'} print:border-none print:shadow-none print:p-0 overflow-x-auto`}>
        
        {/* Renderização Condicional Baseada na Aba Ativa */}
        <div className="min-w-[1024px]"> {/* Força a largura mínima na tela para simular o papel */}
          
          {activeTab === 'LAMINAÇÃO' && (
            <div>
              <PrintHeader title="LAMINAÇÃO" />
              <TableIndustrial titleSection1="PREENCHIMENTO PLANEJAMENTO DE PRODUÇÃO" titleSection2="PREENCHIMENTO LAMINAÇÃO" />
            </div>
          )}

          {activeTab === 'CNC' && (
            <div>
              <PrintHeader title="CNC / CORTE" />
              <TableIndustrial titleSection1="PREENCHIMENTO PLANEJAMENTO DE PRODUÇÃO" titleSection2="PREENCHIMENTO CNC" />
            </div>
          )}

          {activeTab === 'QUALIDADE' && (
            <div>
              <PrintHeader title="QUALIDADE / CONFERÊNCIA" />
              <TableIndustrial titleSection1="PREENCHIMENTO PLANEJAMENTO DE PRODUÇÃO" titleSection2="PREENCHIMENTO QUALIDADE" />
            </div>
          )}

          {activeTab === 'ETIQUETADORA' && (
            <div>
              <PrintHeader title="ETIQUETAR PELÍCULAS" />
              <TableEtiquetadora />
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
