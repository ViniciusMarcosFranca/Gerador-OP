import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Itens() {
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: itemsData } = await supabase.from('items').select(`*, client:clients(name)`);
    const { data: clientsData } = await supabase.from('clients').select('*');
    setItems(itemsData || []);
    setClients(clientsData || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editingId) {
      const { error } = await supabase.from('items').update(formData).eq('id', editingId);
      if (!error) {
        fetchData();
        setFormData({});
        setEditingId(null);
      } else {
        alert('Erro ao atualizar: ' + error.message);
      }
    } else {
      // Verifica se SKU já existe para decidir entre inserir ou atualizar
      const { data: existing } = await supabase.from('items').select('id').eq('sku', formData.sku).maybeSingle();
      if (existing) {
        const confirmar = window.confirm(`O SKU "${formData.sku}" já está cadastrado. Deseja atualizar os dados desse item?`);
        if (!confirmar) return;
        const { error } = await supabase.from('items').update(formData).eq('id', existing.id);
        if (!error) { fetchData(); setFormData({}); }
        else alert('Erro ao atualizar: ' + error.message);
      } else {
        const { error } = await supabase.from('items').insert([formData]);
        if (!error) { fetchData(); setFormData({}); }
        else alert('Erro ao inserir: ' + error.message);
      }
      setEditingId(null);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir este item? Esta ação não poderá ser desfeita.')) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) {
      if (error.message.includes('foreign key') || error.message.includes('referenced')) {
        alert('⚠️ Este item não pode ser excluído pois está vinculado a uma ou mais Ordens de Produção.\n\nPara excluir, você precisaria remover o item das OPs em que ele aparece primeiro.');
      } else {
        alert('Erro ao excluir: ' + error.message);
      }
    } else {
      fetchData();
    }
  }

  function handleEdit(item) {
    setFormData(item);
    setEditingId(item.id);
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const formattedData = [];
        for (const row of data) {
          let client_id = null;
          if (row['Cliente']) {
            const client = clients.find(c => c.name.toLowerCase() === String(row['Cliente']).toLowerCase());
            if (client) client_id = client.id;
          }

          formattedData.push({
            sku: row['SKU'] ? String(row['SKU']) : '',
            description: row['Descricao'] || row['Descrição'] || '',
            client_id: client_id,
            screen_ref: row['Ref Tela'] || row['Ref. Tela'] || '',
            knife_ref: row['Ref Faca'] || row['Ref. Faca'] || '',
            min_coil_width: row['Largura Bobina Minima'] || row['Largura Bobina Mínima'] || ''
          });
        }

        const validData = formattedData.filter(d => d.sku && d.description);
        if (validData.length > 0) {
          const { error } = await supabase.from('items').upsert(validData, { onConflict: 'sku' });
          if (error) throw error;
          alert('Importação concluída com sucesso!');
          fetchData();
        } else {
          alert('Nenhum dado válido encontrado. Verifique as colunas da planilha (SKU, Descrição).');
        }
      } catch (err) {
        alert('Erro ao importar: ' + err.message);
      }
      if(fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Cadastro de Itens</h1>
        <div>
          <input type="file" accept=".xlsx, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button 
            onClick={() => fileInputRef.current.click()}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Upload className="w-4 h-4 mr-2" /> Importar Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h2 className="text-lg font-medium mb-4">{editingId ? 'Editar Item' : 'Novo Item'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-end">
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input required type="text" className="w-full px-3 py-2 border rounded-md" value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input required type="text" className="w-full px-3 py-2 border rounded-md" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select className="w-full px-3 py-2 border rounded-md" value={formData.client_id || ''} onChange={e => setFormData({...formData, client_id: e.target.value})}>
              <option value="">Selecione...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ref. Tela</label>
            <input type="text" className="w-full px-3 py-2 border rounded-md" value={formData.screen_ref || ''} onChange={e => setFormData({...formData, screen_ref: e.target.value})} />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ref. Faca</label>
            <input type="text" className="w-full px-3 py-2 border rounded-md" value={formData.knife_ref || ''} onChange={e => setFormData({...formData, knife_ref: e.target.value})} />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Largura Bobina Min</label>
            <input type="text" className="w-full px-3 py-2 border rounded-md" value={formData.min_coil_width || ''} onChange={e => setFormData({...formData, min_coil_width: e.target.value})} />
          </div>
          <div className="lg:col-span-7 flex justify-end gap-2 mt-2">
            {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({});}} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>}
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{editingId ? 'Salvar' : 'Adicionar Item'}</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref. Tela</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref. Faca</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Largura Bobina Min</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map(item => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.client?.name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.screen_ref || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.knife_ref || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.min_coil_width || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(item)} className="text-indigo-600 mr-3"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
