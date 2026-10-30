import { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Loader2,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { CONTACT_RELATIONS } from '../utils/constants';
import { isValidPhone, normalizePhone, formatDateTime } from '../utils/helpers';
import toast from '../utils/toast';

const emptyForm = { name: '', phone: '', relation: 'Friend', isPrimary: false };

export default function EmergencyContacts() {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  async function loadContacts() {
    if (!currentUser || !db) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'emergency_contacts'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      setContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to load contacts:', err);
      toast.error('Could not load your contacts. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone, relation: c.relation || 'Friend', isPrimary: Boolean(c.isPrimary) });
    setEditingId(c.id);
    setErrors({});
    setShowForm(true);
  }

  function validate() {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Enter the contact name.';
    if (!isValidPhone(form.phone))
      errs.phone = 'Enter a valid phone number with country code (e.g. +91 98765 43210).';
    return errs;
  }

  async function handleSave(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Keep at most the selected primary: if this one becomes primary,
    // clear the flag on the previous primary contact.
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        phone: normalizePhone(form.phone),
        relation: form.relation,
        isPrimary: form.isPrimary,
      };
      if (editingId) {
        await updateDoc(doc(db, 'emergency_contacts', editingId), {
          ...data,
          updatedAt: serverTimestamp(),
        });
        if (form.isPrimary) {
          await clearOtherPrimaries(editingId);
        }
        toast.success('Contact updated.');
      } else {
        await addDoc(collection(db, 'emergency_contacts'), {
          userId: currentUser.uid,
          ...data,
          createdAt: serverTimestamp(),
        });
        if (form.isPrimary) {
          await clearOtherPrimaries(null, data.phone);
        }
        toast.success('Trusted contact added. They can now receive your SOS alerts.');
      }
      setShowForm(false);
      loadContacts();
    } catch (err) {
      console.error('Save contact failed:', err);
      toast.error(err.code === 'permission-denied'
        ? 'Permission denied by security rules.'
        : 'Could not save the contact. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function clearOtherPrimaries(exceptId, exceptPhone) {
    const others = contacts.filter(
      (c) => c.isPrimary && c.id !== exceptId && c.phone !== exceptPhone
    );
    await Promise.all(
      others.map((c) =>
        updateDoc(doc(db, 'emergency_contacts', c.id), { isPrimary: false })
      )
    );
  }

  async function togglePrimary(c) {
    try {
      if (!c.isPrimary) {
        await updateDoc(doc(db, 'emergency_contacts', c.id), { isPrimary: true });
        await clearOtherPrimaries(c.id);
        toast.success(`${c.name} is now your primary contact.`);
      } else {
        await updateDoc(doc(db, 'emergency_contacts', c.id), { isPrimary: false });
        toast.info(`${c.name} is no longer marked primary.`);
      }
      loadContacts();
    } catch {
      toast.error('Could not update the contact.');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'emergency_contacts', deleteId));
      toast.success('Contact removed.');
      setDeleteId(null);
      loadContacts();
    } catch {
      toast.error('Could not delete the contact.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Emergency Contacts</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            These people receive your SOS alerts with your live location.
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add contact
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={26} className="animate-spin text-primary-500" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="card py-12 text-center">
          <ShieldCheck size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-medium">No trusted contacts yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Add at least two contacts - family and a close friend - so your
            alerts always reach someone.
          </p>
          <button className="btn-primary mt-4" onClick={openAdd}>
            <Plus size={16} /> Add your first contact
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {contacts.map((c) => (
            <li key={c.id} className="card flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="flex items-center gap-1.5 font-semibold">
                    {c.name}
                    {c.isPrimary && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                        Primary
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Phone size={12} /> {c.phone}
                  </p>
                  <p className="text-xs text-gray-400">
                    {c.relation} · added {formatDateTime(c.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => togglePrimary(c)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-amber-500 dark:hover:bg-gray-800"
                  title={c.isPrimary ? 'Remove primary flag' : 'Set as primary contact'}
                >
                  {c.isPrimary ? <Star size={16} className="text-amber-500" fill="currentColor" /> : <StarOff size={16} />}
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-800"
                  title="Edit"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteId(c.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add / edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleSave} className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:rounded-2xl" noValidate>
            <h2 className="mb-4 text-lg font-bold">
              {editingId ? 'Edit contact' : 'Add trusted contact'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="c-name">Name</label>
                <input id="c-name" className="input-field" placeholder="e.g. Amma / Priya" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>
              <div>
                <label className="label" htmlFor="c-phone">Phone (with country code)</label>
                <input id="c-phone" type="tel" className="input-field" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div>
                <label className="label" htmlFor="c-rel">Relationship</label>
                <select id="c-rel" className="input-field" value={form.relation} onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value }))}>
                  {CONTACT_RELATIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary-600"
                  checked={form.isPrimary}
                  onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                />
                <span className="text-sm">
                  Set as <b>primary contact</b> (called first in an emergency)
                </span>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving && <Loader2 size={15} className="animate-spin" />}
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add contact'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <h2 className="mb-2 text-lg font-bold">Remove contact?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This person will no longer receive your emergency alerts.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setDeleteId(null)}>Keep</button>
              <button className="btn-danger" onClick={handleDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
