import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'

interface Category {
  id: string
  name: string
  icon: string
  order: number
  createdAt?: any
  updatedAt?: any
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', icon: '', order: 0 })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'categories'))
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category))
      
      categoriesData.sort((a, b) => a.order - b.order)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setFormData({ name: category.name, icon: category.icon, order: category.order })
  }

  const handleSave = async (categoryId: string) => {
    try {
      await updateDoc(doc(db, 'categories', categoryId), {
        ...formData,
        updatedAt: Timestamp.now()
      })
      
      setCategories(categories.map(cat => 
        cat.id === categoryId ? { ...cat, ...formData } : cat
      ))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Failed to update category')
    }
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.icon) {
      alert('Name and icon are required')
      return
    }

    try {
      const docRef = await addDoc(collection(db, 'categories'), {
        ...formData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      setCategories([...categories, { id: docRef.id, ...formData }])
      setShowAddForm(false)
      setFormData({ name: '', icon: '', order: categories.length + 1 })
    } catch (error) {
      console.error('Error adding category:', error)
      alert('Failed to add category')
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Items using this category will still reference it.')) {
      return
    }

    try {
      await deleteDoc(doc(db, 'categories', categoryId))
      setCategories(categories.filter(cat => cat.id !== categoryId))
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">📁 Categories</h1>
          <p className="text-purple-100">Manage marketplace categories</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Categories ({categories.length})</CardTitle>
              <button
                onClick={() => {
                  setShowAddForm(true)
                  setFormData({ name: '', icon: '', order: categories.length + 1 })
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              >
                + Add Category
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading categories...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {showAddForm && (
                  <div className="p-4 border-2 border-purple-300 rounded-xl bg-purple-50">
                    <h4 className="font-semibold text-gray-900 mb-3">New Category</h4>
                    <div className="grid grid-cols-12 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Emoji icon (e.g., 🎮)"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        className="col-span-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-center text-2xl"
                        maxLength={2}
                      />
                      <input
                        type="text"
                        placeholder="Category name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="col-span-7 px-3 py-2 border-2 border-gray-200 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Order"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                        className="col-span-3 px-3 py-2 border-2 border-gray-200 rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAdd}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {categories.map(category => (
                  <div
                    key={category.id}
                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-purple-200 transition-colors"
                  >
                    {editingId === category.id ? (
                      <>
                        <div className="grid grid-cols-12 gap-3 mb-3">
                          <input
                            type="text"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            className="col-span-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-center text-2xl"
                            maxLength={2}
                          />
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="col-span-7 px-3 py-2 border-2 border-gray-200 rounded-lg"
                          />
                          <input
                            type="number"
                            value={formData.order}
                            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                            className="col-span-3 px-3 py-2 border-2 border-gray-200 rounded-lg"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(category.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-4xl">{category.icon}</div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                            <p className="text-sm text-gray-500">Order: {category.order}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {categories.length === 0 && !showAddForm && (
                  <div className="p-12 text-center">
                    <div className="text-6xl mb-4">📁</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Categories</h3>
                    <p className="text-gray-600">Add your first category to get started.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
