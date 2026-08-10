"use client";

import { useState, useEffect } from "react";
import { Users, Ticket, Trash2, UserPlus, Fingerprint } from "lucide-react";

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [newUserAddress, setNewUserAddress] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Assign state
  const [ticketId, setTicketId] = useState("");
  const [amount, setAmount] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.authenticated) setCurrentUser(data.user);
    });
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserAddress) return;
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: newUserAddress, name: newUserName })
    });
    setNewUserAddress("");
    setNewUserName("");
    fetchUsers();
  };

  const handleDeleteUser = async (id) => {
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    fetchUsers();
  };

  const handleAssignRole = async (id, newRole) => {
    await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role: newRole })
    });
    fetchUsers();
  };

  const toggleSelectUser = (id) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(u => u !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const handleAssignTickets = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0 || !ticketId || !amount) return;
    
    setIsAssigning(true);
    try {
      await fetch('/api/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers,
          ticketIds: [parseInt(ticketId)],
          amounts: [parseInt(amount)]
        })
      });
      setSelectedUsers([]);
      setTicketId("");
      setAmount("");
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
    setIsAssigning(false);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Fingerprint color="var(--primary)" />
            Server Bridge Admin
          </h1>
          <p style={{ color: 'var(--muted)' }}>
            Manage user identities and execute batch mints. 
            {currentUser && <span style={{ marginLeft: '1rem', color: 'var(--accent)' }}>Logged in as {currentUser.name} ({currentUser.role})</span>}
          </p>
        </div>
        <button className="secondary" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.reload(); }}>
          Logout
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* Left Col: User Table */}
        <div className="surface" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>User Database</h2>
            <span className="badge">{users.length} Registered</span>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Name</th>
                  <th>Wallet Address</th>
                  <th>Role</th>
                  <th>Total Tickets</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem 0' }}>
                      No users in database. Add one below.
                    </td>
                  </tr>
                )}
                {users.map(u => (
                  <tr key={u.id} style={{ backgroundColor: selectedUsers.includes(u.id) ? 'rgba(37, 99, 235, 0.05)' : 'transparent' }}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.includes(u.id)}
                        onChange={() => toggleSelectUser(u.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ fontWeight: 500 }}>{u.name || "Anonymous"}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>
                      {u.address.substring(0, 8)}...{u.address.substring(38)}
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: u.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.1)' : u.role === 'CHECKER' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)', color: u.role === 'ADMIN' ? '#ef4444' : u.role === 'CHECKER' ? '#10b981' : 'var(--primary)' }}>
                        {u.role || 'USER'}
                      </span>
                    </td>
                    <td>
                      {u.tickets ? u.tickets.reduce((acc, t) => acc + t.amount, 0) : 0} items
                    </td>
                    <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {/* ADMIN Actions */}
                      {currentUser?.role === 'ADMIN' && u.role !== 'ADMIN' && (
                        <button className="secondary" onClick={() => handleAssignRole(u.id, 'ADMIN')} style={{ padding: '0.5rem', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444' }}>
                          Make Admin
                        </button>
                      )}
                      
                      {/* CHECKER Actions */}
                      {u.role !== 'ADMIN' && u.role !== 'CHECKER' && (
                        <button className="secondary" onClick={() => handleAssignRole(u.id, 'CHECKER')} style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                          Make Checker
                        </button>
                      )}
                      {u.role === 'CHECKER' && (
                        <button className="secondary" onClick={() => handleAssignRole(u.id, 'USER')} style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                          Revoke Checker
                        </button>
                      )}
                      
                      {/* DELETE Action */}
                      {u.role !== 'ADMIN' && (
                        <button className="danger" onClick={() => handleDeleteUser(u.id)} style={{ padding: '0.5rem' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Add User */}
          <div className="surface" style={{ padding: '2rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <UserPlus size={20} color="var(--primary)" /> Register User
            </h2>
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                placeholder="Full Name (Optional)" 
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
              />
              <input 
                placeholder="0x... (Wallet Address)" 
                required
                value={newUserAddress}
                onChange={e => setNewUserAddress(e.target.value)}
              />
              <button type="submit" className="secondary">Add to Database</button>
            </form>
          </div>

          {/* Assign Tickets */}
          <div className="surface" style={{ padding: '2rem', borderTop: selectedUsers.length > 0 ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Ticket size={20} color="var(--primary)" /> Batch Assign
            </h2>
            {selectedUsers.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Select users from the table to assign tickets.</p>
            ) : (
              <form onSubmit={handleAssignTickets} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: '6px', color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 500 }}>
                  Assigning to {selectedUsers.length} selected users
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input 
                    placeholder="Ticket ID (e.g. 101)" 
                    type="number"
                    required
                    value={ticketId}
                    onChange={e => setTicketId(e.target.value)}
                  />
                  <input 
                    placeholder="Amount" 
                    type="number"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={isAssigning}>
                  {isAssigning ? "Executing Mint..." : "Execute Batch Mint"}
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
                  Server Bridge will pay gas via <strong>mintBatch</strong>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
