"use client"

import { useEffect, useState, use, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ExplorerNavbar } from "@/components/explorer/explorer-navbar"
import { ExplorerSidebarEditable } from "@/components/explorer/explorer-sidebar-editable"
import { SchemaTableEditable } from "@/components/schema-table-editable"
import { ColumnProperties } from "@/components/column-properties"
import { projectsApi, versionsApi, mapDictionaryToSchemasUI, type Column, type Table, type Project, type Schema } from "@/lib/api"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreateTableDialog } from "@/components/create-table-dialog"
import { DeleteTableDialog } from "@/components/delete-table-dialog"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

interface OpenTab {
  id: string
  schemaName: string
  tableName: string
  table: Table
}

export default function ExplorerPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [schemas, setSchemas] = useState<Record<string, Schema>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [versionRow, setVersionRow] = useState<{ version: number; name?: string; description?: string } | null>(null)
  const [versions, setVersions] = useState<any[]>([])

  const refreshLatest = async () => {
    const latest = await versionsApi.latest(projectId)
    // Store the full version object, not just the number
    setVersionRow(latest.version ? {
      version: latest.version.version || latest.version,
      name: latest.version.name,
      description: latest.version.description
    } : null)
    
    if (latest.dictionary) {
      setSchemas(mapDictionaryToSchemasUI(latest.dictionary))
    } else {
      setSchemas({})
    }
  }

  const handleVersionChange = useCallback(async (version: number) => {
    try {
      setLoading(true)
      const versionData = await versionsApi.get(projectId, version)
      setVersionRow({
        version: versionData.version.version,
        name: versionData.version.name,
        description: versionData.version.description
      })
      
      if (versionData.dictionary) {
        setSchemas(mapDictionaryToSchemasUI(versionData.dictionary))
      } else {
        setSchemas({})
      }
    } catch (e) {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to load version'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  async function createNewVersion() {
    try {
      setLoading(true)
      const name = `Version ${new Date().toISOString()}`
      const description = "Created from UI"
      await versionsApi.create(projectId, { name, description })
      await refreshLatest()
    } catch (e) {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to create version'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const p = await projectsApi.get(projectId)
        if (!mounted) return
        setProject(p)
        await refreshLatest()
      } catch (e: unknown) {
        if (!mounted) return
        const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to load project'
        setError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [projectId])

  // Always show explorer, never show fallback screen

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<{ column: Column; tableName: string } | null>(null)
  const [creatingTable, setCreatingTable] = useState(false)
  const [deletingTable, setDeletingTable] = useState<string | null>(null)
  const [activeSchemaName, setActiveSchemaName] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const handleTableClick = (schemaName: string, tableName: string, table: Table) => {
    const tabId = `${schemaName}.${tableName}`
    const existingTab = openTabs.find((tab) => tab.id === tabId)

    if (existingTab) {
      setActiveTab(tabId)
    } else {
      const newTab: OpenTab = { id: tabId, schemaName, tableName, table }
      setOpenTabs([...openTabs, newTab])
      setActiveSchemaName(schemaName)
      setActiveTab(tabId)
    }
  }

  const handleCloseTab = (tabId: string) => {
    const newTabs = openTabs.filter((tab) => tab.id !== tabId)
    setOpenTabs(newTabs)

    if (activeTab === tabId) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
    }
  }

  const handleColumnClick = (column: Column, tableName: string) => {
    setSelectedColumn({ column, tableName })
    setRightPanelCollapsed(false)
  }

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      handler: () => setCreatingTable(true)
    },
    {
      key: 's',
      ctrlKey: true,
      handler: () => {
        if (hasUnsavedChanges) {
          console.log('Saving changes...')
          // TODO: Implement save logic
        }
      }
    },
    {
      key: '[',
      ctrlKey: true,
      shiftKey: true,
      handler: () => {
        // Navigate to previous version
        const currentIndex = versions.findIndex(v => v.version === versionRow?.version)
        if (currentIndex > 0 && currentIndex < versions.length - 1) {
          handleVersionChange(versions[currentIndex + 1].version)
        }
      }
    },
    {
      key: ']',
      ctrlKey: true,
      shiftKey: true,
      handler: () => {
        // Navigate to next version
        const currentIndex = versions.findIndex(v => v.version === versionRow?.version)
        if (currentIndex > 0) {
          handleVersionChange(versions[currentIndex - 1].version)
        }
      }
    }
  ])

  return (
    <div className="flex h-screen flex-col bg-background">
      <ExplorerNavbar 
        projectName={project?.name || "Project"}
        currentVersion={versionRow?.version}
        versionName={versionRow?.name}
        isLatestVersion={!!versionRow && versions.find((v: any) => v.is_latest)?.version === versionRow.version}
        hasUnsavedChanges={hasUnsavedChanges}
        userName="User"
        breadcrumbs={activeTab ? [
          { label: activeSchemaName || "public" },
          { label: openTabs.find(t => t.id === activeTab)?.tableName || "" }
        ] : []}
        onSave={() => console.log('Save')}
        onUndo={() => console.log('Undo')}
        onRedo={() => console.log('Redo')}
        canUndo={false}
        canRedo={false}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Show loading/error states as full-screen overlays */}
        {(loading || error) ? (
          <>
            {loading && (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading...</div>
            )}
            {error && !loading && (
              <div className="flex flex-1 items-center justify-center text-sm text-destructive-foreground">{error}</div>
            )}
          </>
        ) : (
          <>
            {/* Left Sidebar */}
            <motion.div
              initial={false}
              animate={{ width: sidebarCollapsed ? 0 : 280 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="border-r border-border"
            >
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full w-[280px]"
                  >
                    {project ? (
                      <ExplorerSidebarEditable
                        project={project}
                        schemas={schemas}
                        onTableClick={handleTableClick}
                        activeTableId={activeTab}
                        currentVersion={versionRow?.version ?? null}
                        versionRow={versionRow}
                        onCreateVersion={createNewVersion}
                        onVersionChange={handleVersionChange}
                        onCreateTable={() => setCreatingTable(true)}
                        onDeleteTable={(schemaName, tableName) => {
                          console.log('Delete table:', schemaName, tableName)
                          // TODO: Implement delete table API call
                        }}
                        onRenameTable={async (schemaName, oldName, newName) => {
                          console.log('Rename table:', schemaName, oldName, '->', newName)
                          // TODO: Implement rename table API call
                        }}
                        onRenameSchema={async (oldName, newName) => {
                          console.log('Rename schema:', oldName, '->', newName)
                          // TODO: Implement rename schema API call
                        }}
                        isRefreshing={loading}
                        hasUnsavedChanges={hasUnsavedChanges}
                      />
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">Loading schema...</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Sidebar Toggle Button */}
            <div className="flex items-start border-r border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-[31px] w-[31px] rounded-none border-b border-border"
              >
                {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {openTabs.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-medium text-muted-foreground">No tables open</p>
                    <p className="text-sm text-muted-foreground">Select a table from the sidebar to get started</p>
                  </div>
                </div>
              ) : (
                <Tabs value={activeTab || undefined} onValueChange={setActiveTab} className="flex flex-1 flex-col">
                  <div className="border-b border-border">
                    <TabsList className="h-auto w-full justify-start rounded-none border-0 bg-transparent p-0">
                      <ScrollArea className="w-full">
                        <div className="flex">
                          {openTabs.map((tab) => (
                            <TabsTrigger
                              key={tab.id}
                              value={tab.id}
                              className="group relative rounded-none border-r border-border data-[state=active]:bg-muted"
                            >
                              <span className="font-mono text-xs">{tab.id}</span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCloseTab(tab.id)
                                }}
                                className="ml-2 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-sm p-0 opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
                                aria-label="Close tab"
                              >
                                <X className="h-3 w-3" />
                              </span>
                            </TabsTrigger>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    {openTabs.map((tab) => (
                      <TabsContent key={tab.id} value={tab.id} className="h-full m-0 p-0">
                        <div className="relative">
                          <div className="absolute right-3 top-3 z-10 flex gap-2">
                            <Button size="sm" variant="destructive" onClick={() => setDeletingTable(tab.table.name)}>
                              Delete Table
                            </Button>
                          </div>
                          <SchemaTableEditable 
                            table={tab.table}
                            projectId={projectId}
                            version={versionRow?.version ?? 0}
                            schemaName={tab.schemaName}
                            onColumnClick={handleColumnClick}
                            onUpdate={refreshLatest}
                          />
                        </div>
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              )}
            </div>

            {/* Right Panel Toggle Button */}
            <div className="flex items-start border-l border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                className="h-[31px] w-[31px] rounded-none border-b border-border"
              >
                {rightPanelCollapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {/* Right Sidebar - Properties Panel */}
            <motion.div
              initial={false}
              animate={{ width: rightPanelCollapsed ? 0 : 320 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="border-l border-border"
            >
              <AnimatePresence>
                {!rightPanelCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full w-[320px]"
                  >
                    <ColumnProperties selectedColumn={selectedColumn} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>

      {/* Table dialogs */}
      <CreateTableDialog
        open={creatingTable}
        onOpenChange={(o) => setCreatingTable(o)}
        projectId={projectId}
        version={versionRow?.version ?? 0}
        schemas={schemas}
        onCreated={refreshLatest}
      />
      <DeleteTableDialog
        open={!!deletingTable}
        onOpenChange={(o) => !o && setDeletingTable(null)}
        projectId={projectId}
        version={versionRow?.version ?? 0}
        schemaName={activeSchemaName || "public"}
        tableName={deletingTable}
        onDeleted={refreshLatest}
      />
    </div>
  )
}
