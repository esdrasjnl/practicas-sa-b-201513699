import React, {useEffect, useState} from 'react';

function App(){
  const [items,setItems] = useState([]);
  useEffect(()=> {
    fetch('/api/items') // si frontend y backend detrás de mismo ingress, /api -> backend
      .then(r=>r.json()).then(setItems);
  }, []);
  return (
    <div>
      <h1>Sistemas Operativos 1 - 2025</h1>
      <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>
    </div>
  );
}
export default App;
