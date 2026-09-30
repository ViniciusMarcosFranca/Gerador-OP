import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, Printer, Trash2, Search } from 'lucide-react';

export default function HistoricoOPs() {
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOP, setSelectedOP] = useState(null);
  const [activeTab, setActiveTab] = useState('LAMINAÇÃO');

  useEffect(() => {
    fetchOPs();
  }, []);

  async function fetchOPs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('production_orders')
      .select(`
        *,
        op_type:op_types(name),
        line_type:line_types(name, recipe_type),
        board_type:board_types(name),
        items:production_order_items(
          id,
          quantity,
          item:items(
            id, sku, description, screen_ref, knife_ref, min_coil_width,
            client:clients(name)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (!error) setOps(data || []);
    setLoading(false);
  }

  async function handleDelete(op) {
    if (!window.confirm('Excluir a OP Nº C' + String(op.op_number).padStart(6, '0') + '? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('production_orders').delete().eq('id', op.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      setSelectedOP(null);
      fetchOPs();
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  function opNumFormatted(num) {
    return 'C' + String(num).padStart(6, '0');
  }

  const filtered = ops.filter(op => {
    const s = search.toLowerCase();
    return (
      String(op.op_number).includes(s) ||
      (op.op_type?.name || '').toLowerCase().includes(s) ||
      (op.line_type?.name || '').toLowerCase().includes(s)
    );
  });

  // --- VISUALIZAÇÃO DETALHADA ---
  if (selectedOP) {
    const tabs = ['LAMINAÇÃO', 'CNC', 'QUALIDADE', 'ETIQUETADORA'];
    const titles = {
      'LAMINAÇÃO': 'LAMINAÇÃO',
      'CNC': 'CNC / CORTE',
      'QUALIDADE': 'QUALIDADE / CONFERÊNCIA',
      'ETIQUETADORA': 'ETIQUETAR PELÍCULAS'
    };

    const recipeParts = (selectedOP.line_type?.recipe_type || '').split('-').map(s => s.trim());

    const PrintHeader = ({ title }) => (
      <div className="w-full mb-2 border-2 border-black bg-white text-black text-[10px] font-sans">
        <div className="flex w-full bg-yellow-300 border-b-2 border-black">
          <div className="w-48 border-r-2 border-black font-bold text-base p-1 text-center">
            Nº {opNumFormatted(selectedOP.op_number)}
          </div>
          <div className="flex-1 font-bold text-lg p-1 text-center uppercase">
            ORDEM DE PRODUÇÃO PARA {title}
          </div>
        </div>
        <div className="flex w-full font-bold">
          <div className="w-48 flex flex-col items-center justify-center p-2 border-r-2 border-black text-center">
            <span className="tracking-widest text-xs">FÁBRICA DE</span>
            <span className="text-base tracking-widest">PELÍCULA</span>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex border-b border-black">
              <div className="w-1/3 p-1 text-right border-r border-black font-normal">Data da Solicitação:</div>
              <div className="w-2/3 p-1 text-center">{formatDate(selectedOP.created_at)}</div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/3 p-1 text-right border-r border-black font-normal">Previsão de entrega até:</div>
              <div className="w-2/3 p-1"></div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/3 p-1 text-right border-r border-black font-normal">Solicitante:</div>
              <div className="w-2/3 p-1"></div>
            </div>
            <div className="flex border-b border-black bg-blue-200">
              <div className="w-1/3 p-1 pl-2 font-normal">Data Recebimento Estoque:</div>
              <div className="w-2/3 p-1"></div>
            </div>
            <div className="flex bg-blue-200">
              <div className="w-1/3 p-1 pl-2 font-normal">Responsável:</div>
              <div className="w-2/3 p-1"></div>
            </div>
          </div>
          <div className="w-64 flex flex-col border-l-2 border-black">
            <div className="flex h-10 border-b border-black">
              <div className="w-1/3 bg-yellow-200 p-1 flex flex-col items-center justify-center border-r border-black text-[9px]">
                <span>PRODUÇÃO</span><span>INTERNA</span>
              </div>
              <div className="w-2/3 bg-yellow-200 p-1 flex items-center justify-center font-bold text-xs">
                {selectedOP.line_type?.name || ''}
              </div>
            </div>
            <div className="flex-1 bg-yellow-200 p-1 flex flex-col text-red-600 text-[9px]">
              <span className="underline mb-1">OBS:</span>
              <span>{selectedOP.observations || ''}</span>
            </div>
          </div>
        </div>
      </div>
    );

    const TableIndustrial = () => (
      <table className="w-full text-center border-collapse text-[8px] border-2 border-black">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-1" rowSpan="2">Prior.</th>
            <th className="border border-black p-1" rowSpan="2">Ref. Tela</th>
            <th className="border border-black p-1" rowSpan="2">Ref. Faca</th>
            <th className="border border-black p-1" rowSpan="2">INDUSTRIAL</th>
            <th className="border border-black p-1 min-w-[160px]" rowSpan="2">Modelo</th>
            <th className="border border-black p-1" rowSpan="2">CLIENTE</th>
            <th className="border border-black p-1" colSpan="5">CAMADAS DE LAMINAÇÕES</th>
            <th className="border border-black p-1" rowSpan="2">QTDE<br/>PEDIDO</th>
            <th className="border border-black p-1" rowSpan="2">QTDE A<br/>PRODUZIR</th>
            <th className="border border-black p-1" rowSpan="2">METROS<br/>CONTADOR</th>
            <th className="border border-black p-1" rowSpan="2">Nº<br/>CARTELAS</th>
            <th className="border border-black p-1" rowSpan="2">Larg.<br/>Bob.<br/>MIN</th>
            <th className="border border-black p-1" rowSpan="2">AB</th>
            <th className="border border-black p-1 w-12" rowSpan="2">Total<br/>laminada</th>
            <th className="border border-black p-1 w-12" rowSpan="2">Qtde<br/>perdida</th>
            <th className="border border-black p-1 w-12" rowSpan="2">Motivo<br/>perda</th>
          </tr>
          <tr className="bg-gray-100">
            {['1º','2º','3º','4º','5º'].map(n => (
              <th key={n} className="border border-black p-1 w-7">{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(selectedOP.items || []).map((opItem, index) => {
            const qtdProduzir = Math.ceil((opItem.quantity || 0) * 1.1);
            return (
              <tr key={opItem.id}>
                <td className="border border-black p-1 font-bold">{index + 1}</td>
                <td className="border border-black p-1 font-bold">{opItem.item?.screen_ref || ''}</td>
                <td className="border border-black p-1 font-bold">{opItem.item?.knife_ref || ''}</td>
                <td className="border border-black p-1 font-bold">{opItem.item?.sku || ''}</td>
                <td className="border border-black p-1 font-bold text-left text-[8px]">{opItem.item?.description || ''}</td>
                <td className="border border-black p-1 font-bold text-red-600">{opItem.item?.client?.name || ''}</td>
                {recipeParts.slice(0, 5).map((p, i) => (
                  <td key={i} className="border border-black p-1">{p}</td>
                ))}
                {Array.from({ length: Math.max(0, 5 - recipeParts.length) }).map((_, i) => (
                  <td key={'e' + i} className="border border-black p-1"></td>
                ))}
                <td className="border border-black p-1 font-bold">{opItem.quantity}</td>
                <td className="border border-black p-1 font-bold text-blue-800">{qtdProduzir}</td>
                <td className="border border-black p-1 font-bold">{(((qtdProduzir / 6) * 350) / 1000).toFixed(2)}</td>
                <td className="border border-black p-1 font-bold">{Math.ceil(qtdProduzir / 6)}</td>
                <td className="border border-black p-1 text-red-600 font-bold">{opItem.item?.min_coil_width || ''}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );

    const TableEtiquetadora = () => (
      <table className="w-full text-center border-collapse text-[8px] border-2 border-black">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-1" rowSpan="2">INDUSTRIAL</th>
            <th className="border border-black p-1 min-w-[160px]" rowSpan="2">Modelo</th>
            <th className="border border-black p-1" rowSpan="2">CLIENTE</th>
            <th className="border border-black p-1" rowSpan="2">QTDE<br/>PEDIDO</th>
            <th className="border border-black p-1" colSpan="10">QUANTIDADES POR LOTE</th>
            <th className="border border-black p-1" rowSpan="2">QTD<br/>TOTAL</th>
          </tr>
          <tr className="bg-gray-100">
            {['1º','2º','3º','4º','5º','6º','7º','8º','9º','10º'].map(n => (
              <th key={n} className="border border-black p-1 w-9">{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(selectedOP.items || []).map((opItem) => (
            <tr key={opItem.id}>
              <td className="border border-black p-1 font-bold">{opItem.item?.sku || ''}</td>
              <td className="border border-black p-1 font-bold text-left text-[8px]">{opItem.item?.description || ''}</td>
              <td className="border border-black p-1 font-bold text-red-600">{opItem.item?.client?.name || ''}</td>
              <td className="border border-black p-1 font-bold">{opItem.quantity}</td>
              {Array.from({ length: 10 }).map((_, i) => (
                <td key={i} className="border border-black p-2"></td>
              ))}
              <td className="border border-black p-1"></td>
            </tr>
          ))}
        </tbody>
      </table>
    );

    return (
      <div>
        <div className="no-print flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedOP(null)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300"
            >
              ← Voltar
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              OP Nº {opNumFormatted(selectedOP.op_number)} — {selectedOP.op_type?.name || ''}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-bold"
            >
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </button>
            <button
              onClick={() => handleDelete(selectedOP)}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir OP
            </button>
          </div>
        </div>

        <div className="no-print flex space-x-2 border-b border-gray-300 pb-px mb-0">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={
                'px-5 py-2 font-bold text-sm rounded-t-lg border-t border-l border-r transition-colors ' +
                (activeTab === tab
                  ? 'bg-white border-gray-300 text-blue-600 relative top-[1px]'
                  : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200')
              }
            >
              {tab}
            </button>
          ))}
        </div>

        <div id="print-area" className="bg-white border border-gray-300 rounded-b-lg p-4 overflow-x-auto print:border-none print:p-0">
          <div className="min-w-[1024px]">
            <PrintHeader title={titles[activeTab]} />
            {activeTab === 'ETIQUETADORA' ? <TableEtiquetadora /> : <TableIndustrial />}
          </div>
        </div>
      </div>
    );
  }

  // --- LISTAGEM ---
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">OPs Emitidas</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nº, tipo ou linha..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Carregando OPs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Nenhuma OP encontrada.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº OP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de OP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Linha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Board</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Itens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emitida em</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(op => (
                <tr key={op.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-red-600 text-lg">{opNumFormatted(op.op_number)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {op.op_type?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {op.line_type?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {op.board_type?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {op.items?.length || 0} {(op.items?.length || 0) === 1 ? 'item' : 'itens'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(op.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => { setSelectedOP(op); setActiveTab('LAMINAÇÃO'); }}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium mr-2"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Visualizar
                    </button>
                    <button
                      onClick={() => handleDelete(op)}
                      className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
