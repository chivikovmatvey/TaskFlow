import { supabase } from './supabaseClient'

export const boardMemberService = {
  async getBoardMembers(boardId) {
    console.log('Fetching board members:', boardId)
    
    const { data, error } = await supabase
      .from('board_members')
      .select('*')
      .eq('board_id', boardId)

    if (error) {
      console.error('Get board members error:', error)
      throw error
    }

    const membersWithProfiles = data.map(member => ({
      ...member,
      profiles: {
        email: member.user_email || member.user_id,
        full_name: null
      }
    }))

    console.log('Board members fetched:', membersWithProfiles)
    return membersWithProfiles
  },

  async inviteMember(boardId, email, role = 'viewer') {
    console.log('Inviting member:', { boardId, email, role })

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    if (currentUser?.email === email) {
      throw new Error('Вы не можете пригласить себя')
    }

    const { data: userId, error: rpcError } = await supabase.rpc('get_user_id_by_email', {
      user_email: email
    })

    if (rpcError || !userId) {
      throw new Error('Пользователь с таким email не найден. Убедитесь, что пользователь зарегистрирован.')
    }

    const { data, error } = await supabase
      .from('board_members')
      .insert({
        board_id: boardId,
        user_id: userId,
        role,
        user_email: email
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Пользователь уже является участником доски')
      }
      console.error('Invite member error:', error)
      throw error
    }

    console.log('Member invited:', data)
    return { ...data, profiles: { email, full_name: null } }
  },

  async removeMember(memberId) {
    console.log('Removing member:', memberId)

    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      console.error('Remove member error:', error)
      throw error
    }

    console.log('Member removed')
  },

  async updateMemberRole(memberId, newRole) {
    console.log('Updating member role:', { memberId, newRole })

    const { data, error } = await supabase
      .from('board_members')
      .update({ role: newRole })
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      console.error('Update role error:', error)
      throw error
    }

    console.log('Role updated:', data)
    return data
  },
}