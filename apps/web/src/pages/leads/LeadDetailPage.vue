<template>
  <q-page class="lead-detail-page">
    <!-- Loading state -->
    <div v-if="leadStore.loading && !lead" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <!-- Not found -->
    <div v-else-if="!lead" class="text-grey-6 text-center q-pa-xl">
      Lead not found.
    </div>

    <!-- Main layout -->
    <div v-else class="row q-col-gutter-md">
      <!-- ============ LEFT SIDEBAR ============ -->
      <div class="col-12 col-md-3">
        <!-- Back link -->
        <router-link to="/crm/pipeline" class="back-link q-mb-sm inline-block">
          <q-icon name="chevron_left" size="18px" />
          <span>Deals</span>
        </router-link>

        <!-- Lead Header Card -->
        <q-card flat class="sidebar-card q-mb-md">
          <q-card-section>
            <h1 class="customer-name q-mt-none q-mb-xs">
              {{ titleCase((lead.customer?.firstName ?? '') + ' ' + (lead.customer?.lastName ?? '')) }}
            </h1>

            <div class="row items-center q-gutter-x-sm q-mb-md">
              <q-badge
                :style="{ backgroundColor: stageColor(lead.currentStage) }"
                class="stage-badge"
                text-color="white"
              >
                {{ formatStage(lead.currentStage) }}
              </q-badge>
              <q-badge v-if="lead.source" outline color="grey-6" class="source-badge">
                {{ formatSource(lead.source) }}
              </q-badge>
            </div>

            <div class="action-bar">
              <q-btn flat dense no-caps icon="sticky_note_2" label="Note" size="sm" color="grey-7" class="action-item" @click="onQuickAction('note')" />
              <q-btn flat dense no-caps icon="email" label="Email" size="sm" color="grey-7" class="action-item" @click="onQuickAction('email')" />
              <q-btn flat dense no-caps icon="phone" label="Call" size="sm" color="grey-7" class="action-item" @click="onQuickAction('call')" />
              <q-btn flat dense no-caps icon="event" label="Schedule" size="sm" color="grey-7" class="action-item" @click="showScheduleDialog = true" />
              <q-separator vertical class="q-mx-xs" style="height: 20px" />
              <q-btn flat dense round icon="more_horiz" size="sm" color="grey-7">
                <q-menu>
                  <q-list dense style="min-width: 180px">
                    <q-item clickable v-close-popup @click="showChangeOrderDialog = true">
                      <q-item-section avatar><q-icon name="description" color="orange-8" size="18px" /></q-item-section>
                      <q-item-section>Change Order</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="showCapDialog = true">
                      <q-item-section avatar><q-icon name="verified" color="purple" size="18px" /></q-item-section>
                      <q-item-section>Generate CAP</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="onQuickAction('email')">
                      <q-item-section avatar><q-icon name="forward_to_inbox" size="18px" /></q-item-section>
                      <q-item-section>Send Email</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>

            <!-- Change Order Dialog -->
            <q-dialog v-model="showChangeOrderDialog" persistent>
              <q-card style="min-width: 420px; border-radius: 16px">
                <q-card-section><div class="text-h6 text-weight-bold">Generate Change Order</div></q-card-section>
                <q-card-section class="q-gutter-md q-pt-none">
                  <q-input v-model="changeOrderNote" label="Changes (one per line)" type="textarea" outlined autogrow />
                  <q-input v-model="changeOrderNotes" label="Additional notes" outlined dense />
                </q-card-section>
                <q-card-actions align="right" class="q-pa-md">
                  <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
                  <q-btn unelevated no-caps label="Generate PDF" color="orange-8" :loading="generatingDoc" @click="generateChangeOrder" style="border-radius: 10px" />
                </q-card-actions>
              </q-card>
            </q-dialog>

            <!-- CAP Dialog -->
            <q-dialog v-model="showCapDialog" persistent>
              <q-card style="min-width: 420px; border-radius: 16px">
                <q-card-section><div class="text-h6 text-weight-bold">Generate CAP</div></q-card-section>
                <q-card-section class="q-gutter-md q-pt-none">
                  <q-option-group v-model="capMode" :options="[{ label: 'Send for e-signature (ZapSign)', value: 'approval' }, { label: 'Send informative email', value: 'informative' }]" color="primary" />
                  <q-input v-model="capSystemSize" label="System Size (kW)" outlined dense />
                  <q-input v-model="capMonthlyPayment" label="Monthly Payment" outlined dense />
                </q-card-section>
                <q-card-actions align="right" class="q-pa-md">
                  <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
                  <q-btn unelevated no-caps label="Generate CAP" color="purple" :loading="generatingDoc" @click="generateCAP" style="border-radius: 10px" />
                </q-card-actions>
              </q-card>
            </q-dialog>

            <!-- Schedule Dialog -->
            <q-dialog v-model="showScheduleDialog" persistent>
              <q-card style="min-width: 420px; border-radius: 16px">
                <q-card-section><div class="text-h6 text-weight-bold">Schedule Appointment</div></q-card-section>
                <q-card-section class="q-gutter-md q-pt-none">
                  <q-select v-model="scheduleType" :options="['SITE_AUDIT', 'INSTALLATION']" label="Type" outlined dense />
                  <q-input v-model="scheduleDate" label="Date & Time" type="datetime-local" outlined dense />
                  <q-input v-model="scheduleDuration" label="Duration (minutes)" type="number" outlined dense />
                  <q-input v-model="scheduleNotes" label="Notes" outlined dense />
                </q-card-section>
                <q-card-actions align="right" class="q-pa-md">
                  <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
                  <q-btn unelevated no-caps label="Book Appointment" color="blue" :loading="scheduling" @click="bookAppointment" style="border-radius: 10px" />
                </q-card-actions>
              </q-card>
            </q-dialog>
          </q-card-section>
        </q-card>

        <!-- About this deal Card -->
        <q-card flat class="sidebar-card">
          <q-expansion-item
            default-opened
            header-class="about-header"
            expand-icon-class="text-grey-6"
          >
            <template #header>
              <q-item-section>
                <span class="section-title">About this deal</span>
              </q-item-section>
            </template>

            <q-card-section class="q-pt-none">
              <div class="about-fields">
                <div class="field-row">
                  <div class="field-label">Deal Stage</div>
                  <q-select
                    v-model="currentStage"
                    :options="stageOptions"
                    emit-value
                    map-options
                    dense
                    borderless
                    class="field-select"
                    @update:model-value="onStageChange"
                  />
                </div>

                <div class="field-row">
                  <div class="field-label">Source</div>
                  <div class="field-value">{{ formatSource(lead.source) || '--' }}</div>
                </div>

                <div class="field-row">
                  <div class="field-label">Monthly Bill</div>
                  <div class="field-value">
                    {{ lead.property?.monthlyBill ? '$' + lead.property.monthlyBill : '--' }}
                  </div>
                </div>

                <div class="field-row">
                  <div class="field-label">System Size</div>
                  <div class="field-value">{{ lead.kw ? lead.kw + ' kW' : '--' }}</div>
                </div>

                <div class="field-row">
                  <div class="field-label">EPC</div>
                  <div class="field-value">{{ lead.epc ? '$' + lead.epc : '--' }}</div>
                </div>

                <div class="field-row">
                  <div class="field-label">Financier</div>
                  <div class="field-value">{{ lead.financier || '--' }}</div>
                </div>

                <q-separator class="q-my-sm" />

                <!-- Owner -->
                <div class="field-row">
                  <div class="field-label">Lead Owner</div>
                  <q-select
                    v-model="selectedOwner"
                    :options="filteredUsers('owner')"
                    option-value="id"
                    option-label="label"
                    emit-value
                    map-options
                    dense
                    borderless
                    use-input
                    input-debounce="200"
                    class="field-select"
                    :loading="loadingUsers"
                    @filter="(val, update) => filterUsers(val, update, 'owner')"
                    @update:model-value="onOwnerChange"
                  >
                    <template #no-option>
                      <q-item><q-item-section class="text-grey-5">No users found</q-item-section></q-item>
                    </template>
                    <template #selected-item="scope">
                      <div class="row items-center no-wrap" style="gap: 6px">
                        <q-avatar size="18px" color="primary" text-color="white" style="font-size: 9px">
                          {{ scope.opt?.label?.charAt(0) || '?' }}
                        </q-avatar>
                        <span class="text-caption">{{ scope.opt?.label || 'Unassigned' }}</span>
                      </div>
                    </template>
                  </q-select>
                </div>

                <!-- Project Manager -->
                <div class="field-row">
                  <div class="field-label">Project Manager</div>
                  <q-select
                    v-model="selectedPM"
                    :options="filteredUsers('pm')"
                    option-value="id"
                    option-label="label"
                    emit-value
                    map-options
                    dense
                    borderless
                    use-input
                    clearable
                    input-debounce="200"
                    class="field-select"
                    :loading="loadingUsers"
                    @filter="(val, update) => filterUsers(val, update, 'pm')"
                    @update:model-value="onPMChange"
                  >
                    <template #no-option>
                      <q-item><q-item-section class="text-grey-5">No users found</q-item-section></q-item>
                    </template>
                    <template #selected-item="scope">
                      <div v-if="scope.opt" class="row items-center no-wrap" style="gap: 6px">
                        <q-avatar size="18px" color="orange-8" text-color="white" style="font-size: 9px">
                          {{ scope.opt?.label?.charAt(0) || '?' }}
                        </q-avatar>
                        <span class="text-caption">{{ scope.opt?.label }}</span>
                      </div>
                      <span v-else class="text-caption text-grey-5">Not assigned</span>
                    </template>
                  </q-select>
                </div>

                <q-separator class="q-my-sm" />

                <div class="field-row">
                  <div class="field-label">Score</div>
                  <div class="field-value row items-center q-gutter-x-xs no-wrap">
                    <span>{{ lead.leadScore?.total ?? '--' }}</span>
                    <q-badge
                      v-if="lead.leadScore?.tier"
                      :style="{ backgroundColor: tierColor(lead.leadScore.tier) }"
                      text-color="white"
                      class="tier-badge"
                    >
                      {{ lead.leadScore.tier }}
                    </q-badge>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field-label">Created</div>
                  <div class="field-value">{{ formatDate(lead.createdAt) }}</div>
                </div>

                <div class="field-row">
                  <div class="field-label">Last updated</div>
                  <div class="field-value">{{ formatDate(lead.updatedAt) }}</div>
                </div>
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>
      </div>

      <!-- ============ CENTER COLUMN ============ -->
      <div class="col-12 col-md-6">
        <div class="center-card">
          <q-tabs
            v-model="activeTab"
            dense
            align="left"
            active-color="primary"
            indicator-color="primary"
            no-caps
            class="center-tabs"
          >
            <q-tab name="activity" label="Activity" />
            <q-tab name="notes" label="Notes" />
            <q-tab name="files" label="Files" />
            <q-tab name="commission" label="Commission" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="activeTab" animated class="center-panels">
            <!-- Activity tab -->
            <q-tab-panel name="activity">
              <LeadTimeline :activities="activities" />
            </q-tab-panel>

            <!-- Notes tab -->
            <q-tab-panel name="notes">
              <div class="q-mb-md">
                <q-input
                  v-model="newNote"
                  type="textarea"
                  outlined
                  placeholder="Add a note..."
                  autogrow
                  :input-style="{ minHeight: '80px' }"
                  class="note-input"
                />
                <div class="row justify-end q-mt-sm">
                  <q-btn
                    unelevated
                    no-caps
                    color="primary"
                    label="Save note"
                    :loading="savingNote"
                    :disable="!newNote.trim()"
                    class="rounded-btn"
                    @click="saveNote"
                  />
                </div>
              </div>

              <q-separator class="q-mb-md" />

              <div v-if="notes.length === 0" class="text-grey-6 text-center q-pa-lg">
                No notes yet.
              </div>
              <div v-for="note in notes" :key="note.id" class="note-item q-mb-md">
                <div class="row items-center q-mb-xs">
                  <q-avatar size="30px" color="grey-3" text-color="grey-7" class="q-mr-sm">
                    <span style="font-size: 10px">{{ initials(note.userName) }}</span>
                  </q-avatar>
                  <span class="text-weight-medium text-body2">{{ note.userName }}</span>
                  <q-space />
                  <span class="text-caption text-grey-5">{{ formatDateTime(note.createdAt) }}</span>
                  <q-btn flat dense round icon="more_vert" size="xs" color="grey-5" class="q-ml-xs">
                    <q-menu>
                      <q-list dense style="min-width: 120px">
                        <q-item clickable v-close-popup @click="startEditNote(note)">
                          <q-item-section avatar><q-icon name="edit" size="16px" /></q-item-section>
                          <q-item-section>Edit</q-item-section>
                        </q-item>
                        <q-item clickable v-close-popup @click="deleteNote(note)">
                          <q-item-section avatar><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                          <q-item-section class="text-negative">Delete</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>
                <!-- Edit mode -->
                <div v-if="editingNoteId === note.id">
                  <q-input
                    v-model="editingNoteContent"
                    type="textarea"
                    outlined
                    autogrow
                    dense
                    class="note-input q-mb-xs"
                  />
                  <div class="row justify-end q-gutter-xs">
                    <q-btn flat dense no-caps label="Cancel" color="grey-6" @click="editingNoteId = null" />
                    <q-btn unelevated dense no-caps label="Save" color="primary" class="rounded-btn" @click="saveEditNote(note)" />
                  </div>
                </div>
                <!-- View mode -->
                <div v-else class="text-body2 text-grey-8 note-body">{{ note.body }}</div>
                <div v-if="note.editedAt" class="text-caption text-grey-4 q-mt-xs" style="font-size: 10px">(edited)</div>
              </div>
            </q-tab-panel>

            <!-- Files tab -->
            <q-tab-panel name="files">
              <div class="row items-center q-mb-md">
                <span class="text-subtitle2 text-weight-bold col">Documents</span>
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  size="sm"
                  icon="upload_file"
                  label="Upload"
                  class="rounded-btn"
                  @click="uploadFile"
                />
              </div>

              <q-list v-if="files.length" separator class="file-list">
                <q-item v-for="file in files" :key="file.id" class="file-item">
                  <q-item-section avatar>
                    <q-icon :name="fileIcon(file.name)" :color="fileIconColor(file.name)" size="24px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ file.name }}</q-item-label>
                    <q-item-label caption>{{ formatFileSize(file.size) }} · {{ formatDate(file.createdAt ?? '') }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <div class="row no-wrap q-gutter-xs">
                      <q-btn flat dense round icon="download" color="grey-7" @click="downloadFile(file)">
                        <q-tooltip>Download</q-tooltip>
                      </q-btn>
                      <q-btn flat dense round icon="delete_outline" color="red-4" @click="deleteFile(file)">
                        <q-tooltip>Delete</q-tooltip>
                      </q-btn>
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>

              <div v-else class="text-grey-6 text-center q-pa-lg">
                No documents uploaded yet.
              </div>
            </q-tab-panel>

            <!-- Commission tab -->
            <q-tab-panel name="commission">
              <div v-if="commissionLines.length" class="commission-table">
                <q-markup-table flat bordered separator="horizontal" class="rounded-card">
                  <thead>
                    <tr>
                      <th class="text-left">Description</th>
                      <th class="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="line in commissionLines" :key="line.label">
                      <td>{{ line.label }}</td>
                      <td class="text-right text-weight-medium">{{ line.value }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="commission-total-row">
                      <td class="text-weight-bold">Total</td>
                      <td class="text-right text-weight-bold text-primary text-h6">
                        {{ commissionTotal }}
                      </td>
                    </tr>
                  </tfoot>
                </q-markup-table>
              </div>
              <div v-else class="text-grey-6 text-center q-pa-lg">
                No commission data available.
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </div>

      <!-- ============ RIGHT SIDEBAR ============ -->
      <div class="col-12 col-md-3 right-sidebar">

        <!-- 1. ATTRIBUTION -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item default-opened header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Attribution</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div v-if="lead.createdBy" class="sidebar-field">
                <div class="sidebar-field-label">Created by</div>
                <div class="sidebar-field-value row items-center no-wrap" style="gap: 6px">
                  <q-avatar size="26px" :color="isExternalCreator ? 'orange-6' : 'primary'" text-color="white" style="font-size: 11px">
                    {{ lead.createdBy.firstName?.charAt(0) }}
                  </q-avatar>
                  <span>{{ titleCase(lead.createdBy.firstName + ' ' + lead.createdBy.lastName) }}</span>
                  <q-badge v-if="isExternalCreator" color="orange-2" text-color="orange-9" dense style="font-size: 10px">Partner</q-badge>
                  <q-badge v-else color="blue-1" text-color="blue-8" dense style="font-size: 10px">Employee</q-badge>
                </div>
                <div class="text-caption text-grey-5" style="margin-left: 26px">{{ lead.createdBy.email }}</div>
              </div>
              <div v-if="referredBy" class="sidebar-field">
                <div class="sidebar-field-label">Referred by</div>
                <div class="sidebar-field-value row items-center no-wrap" style="gap: 6px">
                  <q-avatar size="26px" color="primary" text-color="white" style="font-size: 11px">
                    {{ referredBy.firstName?.charAt(0) }}
                  </q-avatar>
                  <span>{{ titleCase(referredBy.firstName + ' ' + referredBy.lastName) }}</span>
                  <q-badge color="green-1" text-color="green-8" dense style="font-size: 10px">Rep</q-badge>
                </div>
                <div class="text-caption text-grey-5" style="margin-left: 26px">{{ referredBy.email }}</div>
              </div>
              <div v-if="!lead.createdBy && !referredBy" class="text-grey-5 text-caption">No attribution data</div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 2. CONTACT -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item default-opened header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Contact</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div class="field-row">
                <div class="field-label">Name</div>
                <div class="field-value">{{ titleCase((lead.customer?.firstName ?? '') + ' ' + (lead.customer?.lastName ?? '')) || '--' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Email</div>
                <div class="field-value">
                  <a v-if="lead.customer?.email" :href="'mailto:' + lead.customer.email" class="field-link">{{ lead.customer.email }}</a>
                  <span v-else>--</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-label">Phone</div>
                <div class="field-value">
                  <a v-if="lead.customer?.phone" :href="'tel:' + lead.customer.phone" class="field-link">{{ lead.customer.phone }}</a>
                  <span v-else>--</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-label">Source</div>
                <div class="field-value">{{ formatSource(lead.customer?.source) || '--' }}</div>
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 3. PROPERTY -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item default-opened header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Property</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div class="field-row">
                <div class="field-label">Address</div>
                <div class="field-value">{{ lead.property?.streetAddress || '--' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">City</div>
                <div class="field-value">{{ lead.property?.city || '--' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">State</div>
                <div class="field-value">{{ lead.property?.state || '--' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">ZIP</div>
                <div class="field-value">{{ lead.property?.zip || '--' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Property Type</div>
                <div class="field-value">{{ lead.property?.propertyType || '--' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Roof Condition</div>
                <div class="field-value">{{ lead.property?.roofCondition || '--' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Electrical Service</div>
                <div class="field-value">{{ lead.property?.electricalService || '--' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Has Pool</div>
                <div class="field-value">{{ lead.property?.hasPool ? 'Yes' : 'No' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Has EV</div>
                <div class="field-value">{{ lead.property?.hasEV ? 'Yes' : 'No' }}</div>
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 4. ENERGY -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Energy</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div class="field-row">
                <div class="field-label">Monthly Bill</div>
                <div class="field-value">{{ lead.property?.monthlyBill ? '$' + lead.property.monthlyBill : '--' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Annual kWh</div>
                <div class="field-value">{{ lead.property?.annualKwhUsage ? lead.property.annualKwhUsage.toLocaleString() + ' kWh' : '--' }}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Utility Provider</div>
                <div class="field-value">{{ lead.property?.utilityProvider || '--' }}</div>
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 5. DESIGN -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Design</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <template v-if="designRequests.length > 0">
                <div v-for="dr in designRequests" :key="dr.id">
                  <div class="field-row">
                    <div class="field-label">Aurora Link</div>
                    <div class="field-value">
                      <a v-if="dr.auroraProjectUrl" :href="dr.auroraProjectUrl" target="_blank" class="field-link">Open Aurora</a>
                      <span v-else>--</span>
                    </div>
                  </div>
                  <div class="field-row">
                    <div class="field-label">Design Type</div>
                    <div class="field-value">{{ dr.designType === 'AI_DESIGN' ? 'AI Design' : 'Manual' }}</div>
                  </div>
                  <div class="field-row">
                    <div class="field-label">Status</div>
                    <div class="field-value">
                      <q-badge :color="designStatusColor(dr.status)" text-color="white" style="border-radius: 6px; padding: 2px 8px; font-size: 10px">
                        {{ formatDesignStatus(dr.status) }}
                      </q-badge>
                    </div>
                  </div>
                  <div class="field-row">
                    <div class="field-label">Notes</div>
                    <div class="field-value">{{ dr.notes || '--' }}</div>
                  </div>
                </div>
              </template>
              <div v-else class="text-grey-5 text-caption">No design requests</div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 6. SYSTEM & PRICING -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">System & Pricing</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div v-for="field in systemPricingFields" :key="field.key" class="field-row">
                <div class="field-label">{{ field.label }}</div>
                <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
                  {{ field.value || '--' }}
                </div>
                <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 7. FINANCING -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Financing</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div v-for="field in financingFields" :key="field.key" class="field-row">
                <div class="field-label">{{ field.label }}</div>
                <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
                  {{ field.value || '--' }}
                </div>
                <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 8. SITE AUDIT -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Site Audit</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div v-for="field in siteAuditFields" :key="field.key" class="field-row">
                <div class="field-label">{{ field.label }}</div>
                <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
                  {{ field.value || '--' }}
                </div>
                <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 9. QUOTES & UPGRADES -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Quotes & Upgrades</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div v-for="field in quotesUpgradesFields" :key="field.key" class="field-row">
                <div class="field-label">{{ field.label }}</div>
                <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
                  {{ field.value || '--' }}
                </div>
                <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 10. CHANGE ORDER -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Change Order</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div v-for="field in changeOrderFields" :key="field.key" class="field-row">
                <div class="field-label">{{ field.label }}</div>
                <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
                  {{ field.value || '--' }}
                </div>
                <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 11. ENGINEERING -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Engineering</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div v-for="field in engineeringFields" :key="field.key" class="field-row">
                <div class="field-label">{{ field.label }}</div>
                <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
                  {{ field.value || '--' }}
                </div>
                <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 12. INSTALL -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Install</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div v-for="field in installFields" :key="field.key" class="field-row">
                <div class="field-label">{{ field.label }}</div>
                <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
                  {{ field.value || '--' }}
                </div>
                <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 13. PTO & ACTIVATION -->
        <q-card flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">PTO & Activation</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div v-for="field in ptoActivationFields" :key="field.key" class="field-row">
                <div class="field-label">{{ field.label }}</div>
                <div v-if="editingField !== field.key" class="field-value editable" @click="startEdit(field.key, field.value)">
                  {{ field.value || '--' }}
                </div>
                <q-input v-else v-model="editValue" dense borderless autofocus class="inline-edit" @blur="saveField(field.key)" @keyup.enter="saveField(field.key)" />
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 14. APPOINTMENTS -->
        <q-card v-if="appointments.length > 0" flat class="sidebar-section-card q-mb-sm">
          <q-expansion-item header-class="section-header" expand-icon-class="text-grey-6">
            <template #header>
              <q-item-section><span class="section-title">Appointments</span></q-item-section>
            </template>
            <q-card-section class="q-pt-none section-body">
              <div v-for="appt in appointments" :key="appt.id" class="sidebar-field">
                <div class="row items-center no-wrap q-mb-xs" style="gap: 8px">
                  <q-icon
                    :name="appt.type === 'SITE_AUDIT' ? 'home_work' : 'solar_power'"
                    :color="apptStatusColor(appt.status)"
                    size="20px"
                  />
                  <div class="col">
                    <div class="text-weight-medium" style="font-size: 13px">
                      {{ appt.type === 'SITE_AUDIT' ? 'Site Audit' : 'Installation' }}
                    </div>
                    <div class="text-caption text-grey-6">
                      {{ formatDateTime(appt.scheduledAt) }}
                    </div>
                  </div>
                  <q-badge
                    :color="apptStatusColor(appt.status)"
                    text-color="white"
                    style="border-radius: 6px; padding: 2px 8px; font-size: 10px"
                  >
                    {{ appt.status }}
                  </q-badge>
                </div>
                <div class="text-caption text-grey-5" style="margin-left: 28px">
                  Duration: {{ appt.duration }}min
                  <span v-if="appt.notes"> · {{ appt.notes }}</span>
                </div>
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useLeadStore } from '@/stores/lead.store';
import { api } from '@/boot/axios';
import { titleCase } from '@/utils/format';
import LeadTimeline from '@/components/lead/LeadTimeline.vue';

const props = defineProps<{ id: string }>();
const $q = useQuasar();
const leadStore = useLeadStore();

const lead = computed(() => leadStore.currentLead as Record<string, any> | null);
const activeTab = ref('activity');
const currentStage = ref('');

// ---- Stage options & colors ----
const stageOptions = [
  { label: 'New Lead', value: 'NEW_LEAD' },
  { label: 'Request Design', value: 'REQUEST_DESIGN' },
  { label: 'Design In Progress', value: 'DESIGN_IN_PROGRESS' },
  { label: 'Design Ready', value: 'DESIGN_READY' },
  { label: 'Pending Signature', value: 'PENDING_SIGNATURE' },
  { label: 'Won', value: 'WON' },
  { label: 'Lost', value: 'LOST' },
];

const STAGE_COLORS: Record<string, string> = {
  NEW_LEAD: '#4CAF50',
  REQUEST_DESIGN: '#2196F3',
  DESIGN_IN_PROGRESS: '#FF9800',
  DESIGN_READY: '#9C27B0',
  PENDING_SIGNATURE: '#F44336',
  WON: '#00897B',
  LOST: '#EF4444',
};

const TIER_COLORS: Record<string, string> = {
  A: '#10B981',
  B: '#3B82F6',
  C: '#F59E0B',
  D: '#EF4444',
};

function stageColor(stage: string) {
  return STAGE_COLORS[stage] ?? '#9E9E9E';
}

function tierColor(tier: string) {
  return TIER_COLORS[tier] ?? '#9E9E9E';
}

function tierQColor(tier: string) {
  const map: Record<string, string> = { A: 'positive', B: 'primary', C: 'warning', D: 'negative' };
  return map[tier] ?? 'grey';
}

function formatStage(stage: string) {
  return (stage ?? '').replace(/_/g, ' ');
}

function formatSource(source: string | undefined | null) {
  if (!source) return '';
  return source.replace(/_/g, ' ');
}

// ---- Computed helpers ----
const fullAddress = computed(() => {
  const p = lead.value?.property;
  if (!p) return '--';
  const parts = [p.streetAddress, p.city, p.state, p.zip].filter(Boolean);
  return parts.length ? parts.join(', ') : '--';
});

// ---- Attribution ----
const isExternalCreator = computed(() => {
  const email = lead.value?.createdBy?.email ?? '';
  return email && !email.endsWith('@ecoloop.us');
});

const appointments = computed(() => {
  return ((lead.value as any)?.appointments ?? []).sort(
    (a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );
});

function apptStatusColor(status: string) {
  const map: Record<string, string> = { PENDING: 'orange', CONFIRMED: 'blue', COMPLETED: 'positive', CANCELLED: 'grey-5', RESCHEDULED: 'purple' };
  return map[status] ?? 'grey';
}

const designRequests = computed(() => {
  return (lead.value as any)?.designRequests ?? [];
});

function designTypeColor(type: string) {
  return type === 'AI_DESIGN' ? 'purple' : 'blue-grey';
}

function designStatusColor(status: string) {
  const map: Record<string, string> = {
    PENDING: 'orange',
    IN_PROGRESS: 'blue',
    COMPLETED: 'positive',
    FAILED: 'negative',
  };
  return map[status] ?? 'grey';
}

function formatDesignStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
  };
  return map[status] ?? status;
}

const referredBy = computed(() => {
  if (!lead.value) return null;
  // If creator is external, the primary assignment owner is the referrer
  if (isExternalCreator.value) {
    const assignments = (lead.value as any).assignments ?? [];
    const primary = assignments.find((a: any) => a.isPrimary);
    if (primary?.user && primary.userId !== lead.value.createdById) {
      return primary.user;
    }
  }
  return null;
});

// ---- Inline edit for right sidebar ----
const editingField = ref<string | null>(null);
const editValue = ref('');

function startEdit(key: string, currentValue: string) {
  editingField.value = key;
  editValue.value = currentValue || '';
}

async function saveField(key: string) {
  editingField.value = null;
  const val = editValue.value.trim();

  const directFields = ['kw', 'epc', 'financier', 'systemSize'];

  try {
    if (directFields.includes(key)) {
      await api.put(`/leads/${props.id}`, { [key]: val || null });
    } else {
      await api.patch(`/leads/${props.id}/metadata`, { [key]: val || null });
    }
    // Update local state
    if (lead.value) {
      if (directFields.includes(key)) {
        (lead.value as any)[key] = val || null;
      } else {
        const meta = (lead.value as any).metadata ?? {};
        meta[key] = val || null;
        (lead.value as any).metadata = meta;
      }
    }
  } catch {
    // Silently fail - value will revert on next load
  }
}

function getMetaField(key: string): string {
  return ((lead.value as any)?.metadata ?? {})[key] ?? '';
}

// ---- Right sidebar field definitions ----
const systemPricingFields = computed(() => [
  { key: 'kw', label: 'System Size (kW)', value: lead.value?.kw ? String(lead.value.kw) : '' },
  { key: 'epc', label: 'EPC', value: lead.value?.epc ? String(lead.value.epc) : '' },
  { key: 'contractCost', label: 'Contract Cost', value: getMetaField('contractCost') },
  { key: 'solarRate', label: 'Solar Rate', value: getMetaField('solarRate') },
  { key: 'escalator', label: 'Escalator', value: getMetaField('escalator') },
  { key: 'monthlyPayment', label: 'Monthly Payment', value: getMetaField('monthlyPayment') },
  { key: 'systemProduction', label: 'System Production', value: getMetaField('systemProduction') },
  { key: 'customerUsage', label: 'Customer Usage', value: getMetaField('customerUsage') },
  { key: 'calculatedOffset', label: 'Calculated Offset', value: getMetaField('calculatedOffset') },
]);

const financingFields = computed(() => [
  { key: 'preferredFinancing', label: 'Preferred Financing', value: getMetaField('preferredFinancing') },
  { key: 'financier', label: 'Financier', value: lead.value?.financier ? String(lead.value.financier) : '' },
  { key: 'ntpApproval', label: 'NTP Approval', value: getMetaField('ntpApproval') },
  { key: 'm1Payment', label: 'M1 Payment', value: getMetaField('m1Payment') },
  { key: 'm2Payment', label: 'M2 Payment', value: getMetaField('m2Payment') },
  { key: 'm3Approval', label: 'M3 Approval', value: getMetaField('m3Approval') },
]);

const siteAuditFields = computed(() => {
  const auditAppt = appointments.value.find((a: any) => a.type === 'SITE_AUDIT');
  return [
    { key: 'siteAuditDate', label: 'Site Audit Date', value: auditAppt ? formatDateTime(auditAppt.scheduledAt) : getMetaField('siteAuditDate') },
    { key: 'siteAuditInstructions', label: 'Instructions', value: getMetaField('siteAuditInstructions') },
    { key: 'siteAuditStatus', label: 'Status', value: auditAppt ? auditAppt.status : getMetaField('siteAuditStatus') },
    { key: 'surveyReview', label: 'Survey Review', value: getMetaField('surveyReview') },
    { key: 'roofType', label: 'Roof Type', value: getMetaField('roofType') },
  ];
});

const quotesUpgradesFields = computed(() => [
  { key: 'electricalQuote', label: 'Electrical Quote', value: getMetaField('electricalQuote') },
  { key: 'electricalDescription', label: 'Electrical Description', value: getMetaField('electricalDescription') },
  { key: 'roofQuote', label: 'Roof Quote', value: getMetaField('roofQuote') },
  { key: 'roofDescription', label: 'Roof Description', value: getMetaField('roofDescription') },
  { key: 'treeQuote', label: 'Tree Quote', value: getMetaField('treeQuote') },
  { key: 'treeDescription', label: 'Tree Description', value: getMetaField('treeDescription') },
  { key: 'structuralQuote', label: 'Structural Quote', value: getMetaField('structuralQuote') },
  { key: 'structuralDescription', label: 'Structural Description', value: getMetaField('structuralDescription') },
  { key: 'upgradeQuoteTotal', label: 'Upgrade Quote Total', value: getMetaField('upgradeQuoteTotal') },
  { key: 'repApprovals', label: 'Rep Approvals', value: getMetaField('repApprovals') },
]);

const changeOrderFields = computed(() => [
  { key: 'coType', label: 'Type', value: getMetaField('coType') },
  { key: 'coNewSystemSize', label: 'New System Size', value: getMetaField('coNewSystemSize') },
  { key: 'coNewEpc', label: 'New EPC', value: getMetaField('coNewEpc') },
  { key: 'coNewMonthlyPayment', label: 'New Monthly Payment', value: getMetaField('coNewMonthlyPayment') },
  { key: 'coNewEscalator', label: 'New Escalator', value: getMetaField('coNewEscalator') },
  { key: 'coNewOffset', label: 'New Offset', value: getMetaField('coNewOffset') },
  { key: 'coTreeRemoval', label: 'Tree Removal', value: getMetaField('coTreeRemoval') },
  { key: 'coNotes', label: 'Notes', value: getMetaField('coNotes') },
  { key: 'coStatus', label: 'Status', value: getMetaField('coStatus') },
]);

const engineeringFields = computed(() => [
  { key: 'finalDesignStatus', label: 'Final Design Status', value: getMetaField('finalDesignStatus') },
  { key: 'electricalReview', label: 'Electrical Review', value: getMetaField('electricalReview') },
  { key: 'permitStatus', label: 'Permit Status', value: getMetaField('permitStatus') },
  { key: 'icxStatus', label: 'ICX Status', value: getMetaField('icxStatus') },
]);

const installFields = computed(() => {
  const installAppt = appointments.value.find((a: any) => a.type === 'INSTALLATION');
  return [
    { key: 'installStatus', label: 'Install Status', value: getMetaField('installStatus') },
    { key: 'installVisitDate', label: 'Visit Date', value: installAppt ? formatDateTime(installAppt.scheduledAt) : getMetaField('installVisitDate') },
    { key: 'submissionStatus', label: 'Submission Status', value: getMetaField('submissionStatus') },
    { key: 'rejectionDetails', label: 'Rejection Details', value: getMetaField('rejectionDetails') },
  ];
});

const ptoActivationFields = computed(() => [
  { key: 'ptoStatus', label: 'PTO Status', value: getMetaField('ptoStatus') },
  { key: 'systemActivation', label: 'System Activation', value: getMetaField('systemActivation') },
  { key: 'ptoM3Approval', label: 'M3 Approval', value: getMetaField('ptoM3Approval') },
]);

// ---- Extra data refs ----
interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userName?: string;
}

interface NoteItem {
  id: string;
  body: string;
  userName: string;
  createdAt: string;
  editedAt?: string;
}

interface FileItem {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  createdAt?: string;
  uploadedAt?: string;
}

const activities = ref<Activity[]>([]);
const notes = ref<NoteItem[]>([]);
const files = ref<FileItem[]>([]);
const commissionLines = ref<{ label: string; value: string }[]>([]);
const commissionTotal = ref('$0');
const newNote = ref('');
const savingNote = ref(false);

// ---- Lifecycle ----
onMounted(async () => {
  await leadStore.fetchLead(props.id);
  if (lead.value) {
    currentStage.value = lead.value.currentStage as string;
    initAssignments();
  }
  loadExtras();
  loadUsers();
});

async function loadExtras() {
  const [timelineRes, docsRes, commRes] = await Promise.all([
    api.get<Activity[]>(`/leads/${props.id}/timeline`).catch(() => ({ data: [] as Activity[] })),
    api.get<FileItem[]>(`/leads/${props.id}/documents`).catch(() => ({ data: [] as FileItem[] })),
    api.get(`/leads/${props.id}/commissions`).catch(() => ({ data: [] })),
  ]);

  activities.value = Array.isArray(timelineRes.data) ? timelineRes.data : [];
  files.value = Array.isArray(docsRes.data) ? docsRes.data : [];

  // Extract notes from timeline (type NOTE_ADDED, exclude deleted and edit-log entries)
  notes.value = activities.value
    .filter((a) => a.type === 'NOTE_ADDED' && a.description !== '[deleted]' && !(a as any).metadata?.action)
    .map((a) => ({
      id: a.id,
      body: a.description,
      userName: a.userName ?? (a as any).user ? `${(a as any).user.firstName} ${(a as any).user.lastName}` : 'Unknown',
      createdAt: a.createdAt,
      editedAt: (a as any).metadata?.editedAt,
    }));

  const commData = commRes.data as any;
  commissionLines.value = commData?.lines ?? [];
  commissionTotal.value = commData?.total ?? '$0';
}

// ---- Actions ----
async function onStageChange(newStage: string) {
  try {
    await leadStore.changeStage(props.id, newStage);
    $q.notify({ type: 'positive', message: 'Stage updated' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update stage' });
    if (lead.value) currentStage.value = lead.value.currentStage as string;
  }
}

function onQuickAction(type: string) {
  if (type === 'note') {
    activeTab.value = 'notes';
  } else if (type === 'email' && lead.value?.customer?.email) {
    window.open('mailto:' + lead.value.customer.email);
  } else if (type === 'call' && lead.value?.customer?.phone) {
    window.open('tel:' + lead.value.customer.phone);
  }
}

// ---- Owner & PM Assignment ----
interface UserOption {
  id: string;
  label: string;
  email: string;
  role: string;
}

const allUsers = ref<UserOption[]>([]);
const loadingUsers = ref(false);
const selectedOwner = ref<string | null>(null);
const selectedPM = ref<string | null>(null);
const ownerFilteredUsers = ref<UserOption[]>([]);
const pmFilteredUsers = ref<UserOption[]>([]);

function filteredUsers(which: string) {
  return which === 'owner' ? ownerFilteredUsers.value : pmFilteredUsers.value;
}

async function loadUsers() {
  if (allUsers.value.length > 0) return;
  loadingUsers.value = true;
  try {
    const { data } = await api.get('/users');
    const list = Array.isArray(data) ? data : (data as any).data ?? [];
    allUsers.value = list.map((u: any) => ({
      id: u.id,
      label: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
    }));
  } catch { /* ignore */ }
  finally { loadingUsers.value = false; }
}

function filterUsers(val: string, update: (fn: () => void) => void, which: string) {
  loadUsers().then(() => {
    update(() => {
      const needle = (val || '').toLowerCase();
      const filtered = allUsers.value.filter(
        (u) => u.label.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle),
      );
      if (which === 'owner') ownerFilteredUsers.value = filtered;
      else pmFilteredUsers.value = filtered;
    });
  });
}

async function onOwnerChange(userId: string | null) {
  if (!userId) return;
  try {
    await api.post(`/leads/${props.id}/assign`, {
      userId,
      splitPct: 100,
      isPrimary: true,
    });
    $q.notify({ type: 'positive', message: 'Lead owner updated' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update owner' });
  }
}

async function onPMChange(pmId: string | null) {
  try {
    if (pmId) {
      await api.post(`/leads/${props.id}/assign-pm`, { projectManagerId: pmId });
      $q.notify({ type: 'positive', message: 'Project Manager assigned' });
    } else {
      await api.post(`/leads/${props.id}/assign-pm`, { projectManagerId: null });
      $q.notify({ type: 'positive', message: 'Project Manager removed' });
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update Project Manager' });
  }
}

// Initialize owner/PM from lead data
function initAssignments() {
  if (!lead.value) return;
  const assignments = (lead.value as any).assignments ?? [];
  const primary = assignments.find((a: any) => a.isPrimary);
  if (primary) {
    selectedOwner.value = primary.userId;
    // Pre-populate allUsers with known assignment users so selects show labels immediately
    if (primary.user && !allUsers.value.find((u) => u.id === primary.userId)) {
      allUsers.value.push({
        id: primary.userId,
        label: `${primary.user.firstName} ${primary.user.lastName}`,
        email: primary.user.email,
        role: '',
      });
    }
  }
  selectedPM.value = (lead.value as any).projectManagerId ?? null;
  if (selectedPM.value && (lead.value as any).projectManager) {
    const pm = (lead.value as any).projectManager;
    if (!allUsers.value.find((u) => u.id === selectedPM.value)) {
      allUsers.value.push({
        id: pm.id,
        label: `${pm.firstName} ${pm.lastName}`,
        email: pm.email,
        role: '',
      });
    }
  }
  // Seed filtered lists
  ownerFilteredUsers.value = [...allUsers.value];
  pmFilteredUsers.value = [...allUsers.value];
}

async function saveNote() {
  if (!newNote.value.trim()) return;
  savingNote.value = true;
  try {
    const { data } = await api.post(`/leads/${props.id}/notes`, { content: newNote.value.trim() });
    const noteItem: NoteItem = {
      id: data.id ?? crypto.randomUUID(),
      body: newNote.value.trim(),
      userName: data.userName ?? 'You',
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
    notes.value.unshift(noteItem);
    newNote.value = '';
    $q.notify({ type: 'positive', message: 'Note saved' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save note' });
  } finally {
    savingNote.value = false;
  }
}

// ---- Edit/Delete Notes ----
const editingNoteId = ref<string | null>(null);
const editingNoteContent = ref('');

function startEditNote(note: NoteItem) {
  editingNoteId.value = note.id;
  editingNoteContent.value = note.body;
}

async function saveEditNote(note: NoteItem) {
  if (!editingNoteContent.value.trim()) return;
  try {
    await api.put(`/leads/${props.id}/notes/${note.id}`, { content: editingNoteContent.value.trim() });
    note.body = editingNoteContent.value.trim();
    note.editedAt = new Date().toISOString();
    editingNoteId.value = null;
    $q.notify({ type: 'positive', message: 'Note updated' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update note' });
  }
}

async function deleteNote(note: NoteItem) {
  $q.dialog({
    title: 'Delete Note',
    message: 'Are you sure you want to delete this note? This will be logged in the activity.',
    cancel: true,
    ok: { label: 'Delete', color: 'negative', flat: true },
  }).onOk(async () => {
    try {
      await api.patch(`/leads/${props.id}/notes/${note.id}/delete`);
      notes.value = notes.value.filter((n) => n.id !== note.id);
      $q.notify({ type: 'positive', message: 'Note deleted' });
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to delete note' });
    }
  });
}

// ---- Document Generation (Change Order, CAP) ----
const showChangeOrderDialog = ref(false);
const changeOrderNote = ref('');
const changeOrderNotes = ref('');
const generatingDoc = ref(false);

async function generateChangeOrder() {
  generatingDoc.value = true;
  try {
    const changes = changeOrderNote.value.split('\n').filter((l) => l.trim());
    const { data } = await api.post(`/leads/${props.id}/change-order`, {
      changes,
      notes: changeOrderNotes.value || undefined,
    });
    files.value.unshift({ id: data.id, name: data.name, url: data.url, size: data.size, createdAt: new Date().toISOString() });
    showChangeOrderDialog.value = false;
    changeOrderNote.value = '';
    changeOrderNotes.value = '';
    $q.notify({ type: 'positive', message: 'Change Order generated' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to generate Change Order' });
  } finally {
    generatingDoc.value = false;
  }
}

const showCapDialog = ref(false);
const capMode = ref('approval');
const capSystemSize = ref('');
const capMonthlyPayment = ref('');

async function generateCAP() {
  generatingDoc.value = true;
  try {
    const { data } = await api.post(`/leads/${props.id}/cap`, {
      mode: capMode.value,
      systemSize: capSystemSize.value || undefined,
      monthlyPayment: capMonthlyPayment.value || undefined,
    });
    files.value.unshift({ id: data.id, name: data.name, url: data.url, size: data.size, createdAt: new Date().toISOString() });
    showCapDialog.value = false;
    const msg = data.zapSign ? 'CAP sent for e-signature via ZapSign' : 'CAP generated and emailed';
    $q.notify({ type: 'positive', message: msg });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to generate CAP' });
  } finally {
    generatingDoc.value = false;
  }
}

// ---- Scheduling ----
const showScheduleDialog = ref(false);
const scheduleType = ref('SITE_AUDIT');
const scheduleDate = ref('');
const scheduleDuration = ref(60);
const scheduleNotes = ref('');
const scheduling = ref(false);

async function bookAppointment() {
  if (!scheduleDate.value) {
    $q.notify({ type: 'warning', message: 'Please select a date and time' });
    return;
  }
  scheduling.value = true;
  try {
    await api.post(`/leads/${props.id}/appointments`, {
      type: scheduleType.value,
      scheduledAt: new Date(scheduleDate.value).toISOString(),
      duration: scheduleDuration.value,
      notes: scheduleNotes.value || undefined,
    });
    showScheduleDialog.value = false;
    scheduleDate.value = '';
    scheduleNotes.value = '';
    $q.notify({ type: 'positive', message: 'Appointment booked (synced with Jobber)' });
    // Reload activities
    loadExtras();
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to book appointment' });
  } finally {
    scheduling.value = false;
  }
}

function uploadFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.doc,.docx,.jpg,.png';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('leadId', props.id);
    form.append('documentType', 'OTHER');
    try {
      const { data } = await api.post<FileItem>('/documents/upload', form);
      files.value.unshift(data);
      $q.notify({ type: 'positive', message: 'File uploaded' });
    } catch {
      $q.notify({ type: 'negative', message: 'Upload failed' });
    }
  };
  input.click();
}

function downloadFile(file: FileItem) {
  const baseUrl = (process.env.API_URL ?? 'http://localhost:3000');
  window.open(`${baseUrl}${file.url}`, '_blank');
}

function deleteFile(file: FileItem) {
  $q.dialog({
    title: 'Delete File',
    message: `Delete "${file.name}"? This will be logged in the activity.`,
    cancel: true,
    ok: { label: 'Delete', color: 'negative', flat: true },
  }).onOk(async () => {
    try {
      await api.delete(`/documents/${file.id}`);
      files.value = files.value.filter((f) => f.id !== file.id);
      $q.notify({ type: 'positive', message: 'File deleted' });
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to delete file' });
    }
  });
}

function fileIcon(name: string) {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')) return 'image';
  if (['pdf'].includes(ext ?? '')) return 'picture_as_pdf';
  if (['doc', 'docx'].includes(ext ?? '')) return 'description';
  return 'insert_drive_file';
}

function fileIconColor(name: string) {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')) return 'purple';
  if (['pdf'].includes(ext ?? '')) return 'red';
  if (['doc', 'docx'].includes(ext ?? '')) return 'blue';
  return 'grey-6';
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ---- Formatting ----
function formatDate(iso: string) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
</script>

<style lang="scss" scoped>
.lead-detail-page {
  background: #F8FAFB;
  padding: 24px;
  min-height: 100vh;
}

// ---- Back link ----
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: #6B7280;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: color 0.15s;

  &:hover {
    color: #1A1A2E;
  }
}

// ---- Customer name ----
.customer-name {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A2E;
  margin: 0;
  line-height: 1.3;
}

// ---- Badges ----
.stage-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.source-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
}

.tier-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

// ---- Quick actions ----
.action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 0;
  border-top: 1px solid #F3F4F6;
  margin-top: 8px;

  .action-item {
    border-radius: 8px;
    font-size: 12px;
    padding: 4px 8px;

    &:hover {
      background: #F3F4F6;
      color: #00897B !important;
    }
  }
}

// ---- About section ----
.about-header {
  padding: 8px 0;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #1A1A2E;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.about-fields {
  padding: 0 0 8px;
}

.field-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #F3F4F6;

  &:last-child {
    border-bottom: none;
  }
}

.field-label {
  font-size: 13px;
  color: #6B7280;
  font-weight: 500;
  flex-shrink: 0;
  min-width: 100px;
}

.field-value {
  font-size: 13px;
  color: #1A1A2E;
  font-weight: 500;
  text-align: right;
}

.field-select {
  max-width: 160px;

  :deep(.q-field__control) {
    min-height: 28px;
  }

  :deep(.q-field__native) {
    font-size: 13px;
    color: #1A1A2E;
    font-weight: 500;
    padding: 0;
  }
}

// ---- Center column ----
.center-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.center-tabs {
  :deep(.q-tab) {
    font-weight: 600;
    font-size: 13px;
  }
}

.center-panels {
  min-height: 400px;

  :deep(.q-tab-panel) {
    padding: 20px;
  }
}

// ---- Notes ----
.note-input {
  :deep(.q-field__control) {
    border-radius: 10px;
  }
}

.note-item {
  padding: 12px;
  background: #F9FAFB;
  border-radius: 10px;
}

.note-body {
  padding-left: 34px;
  white-space: pre-wrap;
}

// ---- Files ----
.file-list {
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  overflow: hidden;
}

.file-item {
  transition: background 0.15s;

  &:hover {
    background: #F9FAFB;
  }
}

// ---- Commission ----
.commission-total-row {
  background: #F9FAFB;
}

// ---- Sidebar cards ----
.sidebar-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 16px;

  &.q-card {
    padding: 0;
    box-shadow: none;
  }
}

.sidebar-card-title {
  font-size: 13px;
  font-weight: 700;
  color: #1A1A2E;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #F3F4F6;
}

.sidebar-field {
  margin-bottom: 10px;

  &:last-child {
    margin-bottom: 0;
  }
}

.sidebar-field-label {
  font-size: 11px;
  color: #9CA3AF;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 2px;
}

.sidebar-field-value {
  font-size: 13px;
  color: #1A1A2E;
  font-weight: 500;
}

.field-link {
  color: #4F46E5;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

// ---- Score bars ----
.score-row {
  margin-bottom: 10px;

  &:last-child {
    margin-bottom: 0;
  }
}

// ---- Utility ----
.rounded-btn {
  border-radius: 10px;
}

.rounded-card {
  border-radius: 12px;
}

.inline-block {
  display: inline-block;
}

// ---- Right sidebar sections ----
.right-sidebar {
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding-bottom: 24px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #D1D5DB;
    border-radius: 4px;
  }
}

.sidebar-section-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  box-shadow: none;

  :deep(.q-expansion-item) {
    .q-item {
      padding: 10px 16px;
      min-height: 40px;
    }
  }
}

.section-header {
  padding: 8px 0;
}

.section-body {
  padding: 0 16px 12px;
}

.field-value.editable {
  cursor: pointer;
  border-radius: 4px;
  padding: 1px 4px;
  margin: -1px -4px;
  transition: background 0.15s;

  &:hover {
    background: #F3F4F6;
  }
}

.inline-edit {
  max-width: 160px;
  margin-left: auto;

  :deep(.q-field__control) {
    min-height: 24px;
  }

  :deep(input) {
    font-size: 13px;
    font-weight: 600;
    padding: 0;
    text-align: right;
  }
}
</style>
